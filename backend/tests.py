"""
ILES Backend Test Suite
Covers: auth, placements, logbook, evaluations, dashboard, RBAC
Run: python manage.py test tests --verbosity=2
"""
from django.test import TestCase
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.utils import timezone
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from placements.models import InternshipPlacement
from logbook.models import WeeklyLog, StatusHistory
from evaluations.models import EvaluationCriteria, Evaluation, CriteriaScore

User = get_user_model()


def make_user(username, role, **kwargs):
    return User.objects.create_user(
        username=username, password='Test@1234',
        first_name=username.title(), last_name='Test',
        role=role, email=f'{username}@test.ug', **kwargs
    )


def auth_client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def make_placement(student, wp_sup=None, ac_sup=None, status='active', admin=None,
                   start_offset=-10, end_offset=80):
    start = date.today() + timedelta(days=start_offset)
    end = date.today() + timedelta(days=end_offset)
    return InternshipPlacement.objects.create(
        student=student, workplace_supervisor=wp_sup, academic_supervisor=ac_sup,
        organization='Test Corp', start_date=start, end_date=end,
        status=status, created_by=admin or student,
    )


class RegistrationTest(APITestCase):
    def test_student_registration_succeeds(self):
        res = self.client.post('/api/auth/register/', {
            'username': 'teststu', 'email': 'stu@test.ug',
            'first_name': 'Test', 'last_name': 'Student',
            'password': 'Test@1234', 'password2': 'Test@1234', 'role': 'student',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', res.data)
        self.assertEqual(res.data['user']['role'], 'student')

    def test_password_mismatch_rejected(self):
        res = self.client.post('/api/auth/register/', {
            'username': 'stu2', 'email': 'stu2@test.ug',
            'first_name': 'Test', 'last_name': 'User',
            'password': 'Test@1234', 'password2': 'Wrong@5678', 'role': 'student',
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_username_rejected(self):
        make_user('dupuser', 'student')
        res = self.client.post('/api/auth/register/', {
            'username': 'dupuser', 'email': 'dup@test.ug',
            'first_name': 'Dup', 'last_name': 'User',
            'password': 'Test@1234', 'password2': 'Test@1234', 'role': 'student',
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class AuthTest(APITestCase):
    def setUp(self):
        self.user = make_user('authuser', 'student')

    def test_login_returns_tokens_and_user(self):
        res = self.client.post('/api/auth/login/', {'username': 'authuser', 'password': 'Test@1234'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('access', res.data)
        self.assertEqual(res.data['user']['username'], 'authuser')

    def test_wrong_password_rejected(self):
        res = self.client.post('/api/auth/login/', {'username': 'authuser', 'password': 'Wrong'})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_profile_denied(self):
        res = self.client.get('/api/auth/me/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_profile_returns_user(self):
        res = auth_client(self.user).get('/api/auth/me/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['username'], 'authuser')


class PlacementTest(APITestCase):
    def setUp(self):
        self.admin = make_user('padm', 'admin', is_staff=True)
        self.student = make_user('pstu', 'student')
        self.wp_sup = make_user('pwp', 'workplace_supervisor')
        self.ac_sup = make_user('pac', 'academic_supervisor')
        self.admin_client = auth_client(self.admin)
        self.student_client = auth_client(self.student)

    def test_admin_creates_placement(self):
        start = date.today().isoformat()
        end = (date.today() + timedelta(days=90)).isoformat()
        res = self.admin_client.post('/api/placements/', {
            'student': self.student.id, 'organization': 'Corp A',
            'start_date': start, 'end_date': end,
            'workplace_supervisor': self.wp_sup.id,
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['organization'], 'Corp A')

    def test_student_sees_only_own_placements(self):
        other_student = make_user('pstu2', 'student')
        make_placement(self.student, admin=self.admin)
        make_placement(other_student, admin=self.admin)
        res = self.student_client.get('/api/placements/')
        rows = res.data.get('results', res.data)
        self.assertTrue(all(r['student'] == self.student.id for r in rows))

    def test_overlapping_placement_rejected(self):
        start = date.today()
        end = start + timedelta(days=90)
        InternshipPlacement.objects.create(
            student=self.student, organization='Org A',
            start_date=start, end_date=end, status='active', created_by=self.admin,
        )
        with self.assertRaises(Exception):
            InternshipPlacement.objects.create(
                student=self.student, organization='Org B',
                start_date=start + timedelta(days=10),
                end_date=end + timedelta(days=30),
                status='active', created_by=self.admin,
            )

    def test_end_before_start_rejected(self):
        res = self.admin_client.post('/api/placements/', {
            'student': self.student.id, 'organization': 'Bad',
            'start_date': date.today().isoformat(),
            'end_date': (date.today() - timedelta(days=1)).isoformat(),
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_draft_allowed(self):
        p = make_placement(self.student, status='draft', admin=self.admin)
        res = self.admin_client.delete(f'/api/placements/{p.id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_active_rejected(self):
        p = make_placement(self.student, status='active', admin=self.admin)
        res = self.admin_client.delete(f'/api/placements/{p.id}/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class LogbookTest(APITestCase):
    def setUp(self):
        self.admin = make_user('ladm', 'admin', is_staff=True)
        self.student = make_user('lstu', 'student')
        self.wp_sup = make_user('lwp', 'workplace_supervisor')
        self.placement = make_placement(self.student, self.wp_sup, admin=self.admin)
        self.student_client = auth_client(self.student)
        self.sup_client = auth_client(self.wp_sup)

    def test_student_creates_log(self):
        res = self.student_client.post('/api/logs/', {
            'placement': self.placement.id, 'week_number': 1,
            'activities': 'Dev environment setup.',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['status'], 'draft')

    def test_submit_transitions_to_submitted(self):
        log = WeeklyLog.objects.create(
            student=self.student, placement=self.placement,
            week_number=2, activities='Week 2.', status='draft'
        )
        res = self.student_client.post(f'/api/logs/{log.id}/transition/', {'status': 'submitted'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], 'submitted')

    def test_invalid_transition_rejected(self):
        log = WeeklyLog.objects.create(
            student=self.student, placement=self.placement,
            week_number=3, activities='Draft.', status='draft'
        )
        # Student cannot jump straight to approved (only submitted is allowed)
        res = self.student_client.post(f'/api/logs/{log.id}/transition/', {'status': 'approved'})
        self.assertIn(res.status_code, [400, 403])

    def test_supervisor_reviews_log(self):
        log = WeeklyLog.objects.create(
            student=self.student, placement=self.placement,
            week_number=4, activities='Week 4.', status='submitted',
            submitted_at=timezone.now()
        )
        StatusHistory.objects.create(log=log, changed_by=self.student,
                                     from_status='draft', to_status='submitted')
        res = self.sup_client.post(f'/api/logs/{log.id}/transition/', {
            'status': 'reviewed', 'comments': 'Good work.', 'note': 'Reviewed.',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], 'reviewed')

    def test_approved_log_cannot_be_edited(self):
        log = WeeklyLog.objects.create(
            student=self.student, placement=self.placement,
            week_number=5, activities='Final.', status='approved'
        )
        res = self.student_client.patch(f'/api/logs/{log.id}/', {'activities': 'Changed'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_audit_trail_recorded(self):
        log = WeeklyLog.objects.create(
            student=self.student, placement=self.placement,
            week_number=6, activities='Week 6.', status='draft'
        )
        self.student_client.post(f'/api/logs/{log.id}/transition/', {'status': 'submitted'})
        history = StatusHistory.objects.filter(log=log)
        self.assertEqual(history.count(), 1)
        self.assertEqual(history.first().to_status, 'submitted')
        self.assertEqual(history.first().changed_by, self.student)

    def test_supervisor_cannot_submit_as_student(self):
        log = WeeklyLog.objects.create(
            student=self.student, placement=self.placement,
            week_number=7, activities='Draft.', status='draft'
        )
        res = self.sup_client.post(f'/api/logs/{log.id}/transition/', {'status': 'submitted'})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class EvaluationTest(APITestCase):
    def setUp(self):
        self.admin = make_user('eadm', 'admin', is_staff=True)
        self.student = make_user('estu', 'student')
        self.wp_sup = make_user('ewp', 'workplace_supervisor')
        self.placement = make_placement(self.student, self.wp_sup, admin=self.admin)
        self.sup_client = auth_client(self.wp_sup)
        self.student_client = auth_client(self.student)
        self.cr1 = EvaluationCriteria.objects.create(
            name='Technical', weight=60, evaluator_type='workplace', max_score=100)
        self.cr2 = EvaluationCriteria.objects.create(
            name='Attitude', weight=40, evaluator_type='workplace', max_score=100)

    def test_supervisor_creates_evaluation(self):
        res = self.sup_client.post('/api/evaluations/', {
            'placement': self.placement.id, 'student': self.student.id,
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['evaluator_type'], 'workplace')

    def test_duplicate_evaluation_rejected(self):
        Evaluation.objects.create(
            placement=self.placement, student=self.student,
            evaluator=self.wp_sup, evaluator_type='workplace'
        )
        res = self.sup_client.post('/api/evaluations/', {
            'placement': self.placement.id, 'student': self.student.id,
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_score_submission_computes_grade(self):
        ev = Evaluation.objects.create(
            placement=self.placement, student=self.student,
            evaluator=self.wp_sup, evaluator_type='workplace'
        )
        res = self.sup_client.post(f'/api/evaluations/{ev.id}/submit/', {
            'scores': [
                {'criteria': self.cr1.id, 'score': 85},
                {'criteria': self.cr2.id, 'score': 70},
            ],
            'comments': 'Solid performance.',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['is_submitted'])
        self.assertIsNotNone(res.data['total_score'])
        self.assertIn(res.data['grade'], ['A', 'B', 'C', 'D', 'F'])

    def test_double_submit_rejected(self):
        ev = Evaluation.objects.create(
            placement=self.placement, student=self.student,
            evaluator=self.wp_sup, evaluator_type='workplace'
        )
        CriteriaScore.objects.create(evaluation=ev, criteria=self.cr1, score=80)
        ev.submit()
        res = self.sup_client.post(f'/api/evaluations/{ev.id}/submit/', {
            'scores': [{'criteria': self.cr1.id, 'score': 90}],
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_student_only_sees_own_evaluations(self):
        other_student = make_user('estu2', 'student')
        other_placement = make_placement(other_student, admin=self.admin)
        Evaluation.objects.create(
            placement=other_placement, student=other_student,
            evaluator=self.wp_sup, evaluator_type='workplace'
        )
        res = self.student_client.get('/api/evaluations/')
        for ev in res.data.get('results', res.data):
            self.assertEqual(ev['student'], self.student.id)


class DashboardTest(APITestCase):
    def setUp(self):
        self.admin = make_user('dadm', 'admin', is_staff=True)
        self.student = make_user('dstu', 'student')
        self.wp_sup = make_user('dwp', 'workplace_supervisor')

    def test_student_dashboard(self):
        res = auth_client(self.student).get('/api/dashboard/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['role'], 'student')
        self.assertIn('total_placements', res.data['stats'])

    def test_admin_dashboard(self):
        res = auth_client(self.admin).get('/api/dashboard/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['role'], 'admin')
        self.assertIn('total_students', res.data['stats'])

    def test_supervisor_dashboard(self):
        res = auth_client(self.wp_sup).get('/api/dashboard/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('pending_reviews', res.data['stats'])

    def test_unauthenticated_denied(self):
        res = self.client.get('/api/dashboard/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
