#!/usr/bin/env python
"""
Run after migrate to seed an admin user and default evaluation criteria.
Usage: python seed.py
"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'iles_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from evaluations.models import EvaluationCriteria

User = get_user_model()

# --- Admin user ---
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser(
        username='admin',
        email='admin@iles.ac.ug',
        password='Admin@1234!',
        first_name='System',
        last_name='Administrator',
        role='admin',
    )
    print("✓ Admin created  →  username: admin  |  password: Admin@1234!")
else:
    print("  Admin already exists")

# --- Demo users ---
demo_users = [
    dict(username='student1', first_name='Alice', last_name='Nakato', role='student', student_id='22/U/0001'),
    dict(username='wpsupervisor1', first_name='Bob', last_name='Kamau', role='workplace_supervisor', organization='Stanbic Bank Uganda'),
    dict(username='acsupervisor1', first_name='Dr. Carol', last_name='Atim', role='academic_supervisor', department='Department of Computer Science'),
]
for d in demo_users:
    if not User.objects.filter(username=d['username']).exists():
        User.objects.create_user(password='Demo@1234!', email=f"{d['username']}@iles.ac.ug", **d)
        print(f"✓ Created {d['role']}: {d['username']}  |  password: Demo@1234!")

# --- Default evaluation criteria ---
workplace_criteria = [
    ('Technical Competency', 40, 'Ability to apply technical skills to assigned tasks.'),
    ('Professionalism', 30, 'Punctuality, communication, and workplace conduct.'),
    ('Initiative & Problem Solving', 30, 'Proactive approach and ability to resolve issues.'),
]
academic_criteria = [
    ('Report Quality', 40, 'Clarity, completeness, and accuracy of the internship report.'),
    ('Learning Outcomes', 35, 'Evidence of skill development aligned to course objectives.'),
    ('Presentation', 25, 'Quality of the final internship presentation.'),
]

for name, weight, desc in workplace_criteria:
    obj, created = EvaluationCriteria.objects.get_or_create(
        name=name, evaluator_type='workplace',
        defaults={'weight': weight, 'description': desc, 'max_score': 100}
    )
    if created:
        print(f"✓ Workplace criteria: {name} ({weight}%)")

for name, weight, desc in academic_criteria:
    obj, created = EvaluationCriteria.objects.get_or_create(
        name=name, evaluator_type='academic',
        defaults={'weight': weight, 'description': desc, 'max_score': 100}
    )
    if created:
        print(f"✓ Academic criteria: {name} ({weight}%)")

print("\n✅ Seed complete. Login at /api/admin/ or the frontend.")
