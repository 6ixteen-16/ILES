"""
Usage:
    python manage.py seed_demo

Creates demo users for every role, sample placements, weekly logs,
evaluation criteria, and one submitted evaluation — enough to showcase
every feature of ILES on first run.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import date, timedelta

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed the database with demo data for all roles'

    def handle(self, *args, **options):
        self.stdout.write('Seeding demo data...')

        # ── Users ────────────────────────────────────────────────────────
        admin = self._user('admin', 'Admin', 'ILES', 'admin', 'admin@iles.mak.ac.ug', is_staff=True)
        student1 = self._user('alice', 'Alice', 'Nakato', 'student', 'alice@student.mak.ac.ug',
                              student_id='22/U/0001')
        student2 = self._user('bob', 'Bob', 'Ssebatta', 'student', 'bob@student.mak.ac.ug',
                              student_id='22/U/0002')
        wp_sup = self._user('john_sup', 'John', 'Tumwine', 'workplace_supervisor',
                            'john@techcorp.ug', organization='TechCorp Uganda')
        ac_sup = self._user('dr_peter', 'Peter', 'Wakholi', 'academic_supervisor',
                            'pwakholi@cit.ac.ug', department='Dept. of Computer Science')

        # ── Evaluation Criteria ──────────────────────────────────────────
        from evaluations.models import EvaluationCriteria
        criteria_data = [
            ('Technical Skills', 'Application of technical knowledge on the job', 40, 'workplace', 100),
            ('Professionalism', 'Punctuality, communication, and work ethic', 30, 'workplace', 100),
            ('Initiative', 'Ability to take initiative and problem-solve', 30, 'workplace', 100),
            ('Report Quality', 'Quality of weekly logbook entries', 50, 'academic', 100),
            ('Learning Outcomes', 'Achievement of learning objectives', 50, 'academic', 100),
        ]
        criteria_objs = []
        for name, desc, weight, ev_type, max_score in criteria_data:
            obj, created = EvaluationCriteria.objects.get_or_create(
                name=name, evaluator_type=ev_type,
                defaults={'description': desc, 'weight': weight, 'max_score': max_score}
            )
            criteria_objs.append(obj)
            if created:
                self.stdout.write(f'  Criteria: {name}')

        # ── Placements ───────────────────────────────────────────────────
        from placements.models import InternshipPlacement
        start = date.today() - timedelta(days=30)
        end = start + timedelta(weeks=12)

        p1, _ = InternshipPlacement.objects.get_or_create(
            student=student1, organization='TechCorp Uganda',
            defaults={
                'workplace_supervisor': wp_sup,
                'academic_supervisor': ac_sup,
                'department': 'Software Engineering',
                'address': 'Plot 5, Kampala Road, Kampala',
                'start_date': start,
                'end_date': end,
                'status': 'active',
                'description': 'Software development internship working on enterprise systems.',
                'created_by': admin,
            }
        )

        p2, _ = InternshipPlacement.objects.get_or_create(
            student=student2, organization='Uganda Revenue Authority',
            defaults={
                'workplace_supervisor': wp_sup,
                'academic_supervisor': ac_sup,
                'department': 'ICT',
                'address': 'URA Tower, Nakawa, Kampala',
                'start_date': start,
                'end_date': end,
                'status': 'active',
                'description': 'ICT systems support and data management.',
                'created_by': admin,
            }
        )
        self.stdout.write(f'  Placements: {p1.organization}, {p2.organization}')

        # ── Weekly Logs ──────────────────────────────────────────────────
        from logbook.models import WeeklyLog, StatusHistory
        log_data = [
            (student1, p1, 1, 'approved',
             'Set up development environment, learned the company codebase. Attended orientation and met the team.',
             'Version control workflows were new to me but manageable.',
             'Understood Django project structure and REST API design.',
             'Implement user authentication module.'),
            (student1, p1, 2, 'approved',
             'Implemented JWT authentication for the internal API. Wrote unit tests for auth endpoints.',
             'Debugging token expiry edge cases.',
             'Deepened understanding of stateless authentication.',
             'Work on database schema design.'),
            (student1, p1, 3, 'submitted',
             'Designed ERD for the new inventory module. Had design review session with senior developer.',
             'Balancing normalization with query performance.',
             'Database normalization techniques and trade-offs.',
             'Start implementing the inventory models.'),
            (student2, p2, 1, 'reviewed',
             'Orientation week. Toured the data centre and met the ICT team.',
             'Understanding legacy systems was challenging.',
             'Large-scale government IT infrastructure overview.',
             'Shadow a senior engineer on network monitoring.'),
            (student2, p2, 2, 'draft',
             'Assisted in monitoring the internal network. Documented existing server configurations.',
             '', 'Network topology documentation skills.', ''),
        ]
        for student, placement, week, status, activities, challenges, learnings, objectives in log_data:
            log, created = WeeklyLog.objects.get_or_create(
                placement=placement, week_number=week,
                defaults={
                    'student': student,
                    'activities': activities,
                    'challenges': challenges,
                    'learnings': learnings,
                    'objectives_next_week': objectives,
                    'status': status,
                    'submitted_at': timezone.now() if status != 'draft' else None,
                }
            )
            if created and status != 'draft':
                StatusHistory.objects.create(
                    log=log, changed_by=student,
                    from_status='draft', to_status='submitted',
                    note='Initial submission',
                )
                if status in ('approved', 'reviewed'):
                    StatusHistory.objects.create(
                        log=log, changed_by=wp_sup,
                        from_status='submitted', to_status=status,
                        note='Supervisor review',
                    )

        self.stdout.write(f'  Weekly logs: {len(log_data)} entries')

        # ── Evaluation (one submitted) ────────────────────────────────────
        from evaluations.models import Evaluation, CriteriaScore
        ev, created = Evaluation.objects.get_or_create(
            placement=p1, evaluator=wp_sup,
            defaults={
                'student': student1,
                'evaluator_type': 'workplace',
                'comments': 'Alice shows excellent initiative and technical skills. '
                            'Her communication and professionalism are commendable.',
            }
        )
        if created:
            wp_criteria = [c for c in criteria_objs if c.evaluator_type == 'workplace']
            sample_scores = [82, 90, 78]
            for cr, sc in zip(wp_criteria, sample_scores):
                CriteriaScore.objects.create(evaluation=ev, criteria=cr, score=sc)
            ev.submit()
            self.stdout.write(f'  Evaluation: {ev} — Grade {ev.grade}')

        self.stdout.write(self.style.SUCCESS('\n✅ Demo data seeded successfully!\n'))
        self.stdout.write('Demo accounts (password for all: Demo@1234):')
        self.stdout.write('  admin          → Administrator')
        self.stdout.write('  alice          → Student Intern')
        self.stdout.write('  bob            → Student Intern')
        self.stdout.write('  john_sup       → Workplace Supervisor')
        self.stdout.write('  dr_peter       → Academic Supervisor')

    def _user(self, username, first, last, role, email,
              student_id='', organization='', department='', is_staff=False):
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'first_name': first,
                'last_name': last,
                'role': role,
                'student_id': student_id,
                'organization': organization,
                'department': department,
                'is_staff': is_staff,
                'is_active': True,
            }
        )
        if created:
            user.set_password('Demo@1234')
            user.save()
            self.stdout.write(f'  User: {username} ({role})')
        return user
