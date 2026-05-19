from django.db import migrations


def create_missing_foundation_tables(apps, schema_editor):
    existing_tables = set(schema_editor.connection.introspection.table_names())

    for model_name in ["School", "Program", "Branch", "User", "StudentProfile"]:
        model = apps.get_model("users", model_name)
        if model._meta.db_table not in existing_tables:
            schema_editor.create_model(model)
            existing_tables.add(model._meta.db_table)


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_missing_foundation_tables, migrations.RunPython.noop),
    ]
