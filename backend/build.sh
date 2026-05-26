#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate

# Seed university hierarchy and default quiz data automatically
python manage.py seed_university_hierarchy
python seed_kbc_test.py

