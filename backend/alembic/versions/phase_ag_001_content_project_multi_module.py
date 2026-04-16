"""PHASE AG — ContentProject.module_type artik modul-ustu projeler icin nullable.

Revision ID: phase_ag_001
Revises: phase_ac_001
Create Date: 2026-04-16

Amac:
  ContentProject artik tek bir modul ile sinirli degil. Bir proje altinda
  farkli module_type'dan (news_bulletin, standard_video, product_review)
  Job'lar birlikte yasayabilsin. Bu migrasyon:

  * content_projects.module_type kolonunu NOT NULL'dan nullable'a cevirir.
  * Mevcut NULL olmayan satirlar aynen korunur (legacy projeler).
  * Yeni projeler icin create yolunda default degeri "mixed" olacak
    (servis/sema katmaninda).

  SQLite ile batch_alter_table kullaniyoruz; column type degismeden
  sadece nullable -> True yapiyor. Index (ix_content_projects_module_type)
  olani oldugu yerde kalir.

Downgrade:
  NULL olan satirlari "legacy" varsayilan degeri ile doldurur (veri kaybi
  olmasin diye) ve kolonu tekrar NOT NULL yapar. "mixed" degeri NULL
  olarak islem gormez; o yuzden upgrade sonrasi NULL kalmis mixed/legacy
  satirlar icin downgrade guvenlidir.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "phase_ag_001"
down_revision = "phase_ac_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("content_projects") as batch:
        batch.alter_column(
            "module_type",
            existing_type=sa.String(length=100),
            nullable=True,
        )


def downgrade() -> None:
    conn = op.get_bind()
    # NULL kalan kayitlari "legacy" ile doldur ki NOT NULL'a cevirince
    # veri kaybi/constraint hatasi olmasin.
    conn.execute(
        sa.text(
            "UPDATE content_projects SET module_type = 'legacy' "
            "WHERE module_type IS NULL"
        )
    )
    with op.batch_alter_table("content_projects") as batch:
        batch.alter_column(
            "module_type",
            existing_type=sa.String(length=100),
            nullable=False,
        )
