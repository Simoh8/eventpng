from django.db import migrations, connection


def table_has_column(table_name, column_name):
    """Check if a column exists in a table."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT COUNT(*)
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = %s
            AND COLUMN_NAME = %s
        """, [table_name, column_name])
        return cursor.fetchone()[0] > 0


def apply_migration(apps, schema_editor):
    """Apply the migration safely."""
    # Get the table name for CustomerProfile
    customer_profile_table = 'customer_dashboard_customerprofile'
    
    # Check and remove columns if they exist
    columns_to_remove = ['total_downloads', 'total_purchases', 'total_spent']
    
    with connection.cursor() as cursor:
        for column in columns_to_remove:
            if table_has_column(customer_profile_table, column):
                cursor.execute(f"ALTER TABLE {customer_profile_table} DROP COLUMN {column}")


class Migration(migrations.Migration):

    dependencies = [
        ('customer_dashboard', '0004_rename_customer_da_content_09c7c0_idx_customer_da_content_a39b52_idx_and_more'),
    ]

    operations = [
        migrations.RunPython(apply_migration, migrations.RunPython.noop),
    ]
