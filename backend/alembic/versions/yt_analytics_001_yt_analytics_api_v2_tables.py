"""Sprint 1 (Faz YT-A1): YouTube Analytics API v2 snapshot tables.

Revision ID: yt_analytics_001
Revises: sv_prod_001
Create Date: 2026-04-11

Creates 6 new tables for YouTube Analytics API v2 (yt-analytics.readonly):
  - youtube_channel_analytics_daily
  - youtube_video_analytics_daily
  - youtube_audience_retention
  - youtube_demographics_snapshot
  - youtube_traffic_source_snapshot
  - youtube_device_snapshot
  - youtube_analytics_sync_log

Also adds scope_status transition helper — no schema change on
platform_connections itself, the existing `requires_reauth` flag is reused.
"""

from alembic import op
import sqlalchemy as sa

revision = "yt_analytics_001"
down_revision = "sv_prod_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "youtube_channel_analytics_daily",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("platform_connection_id", sa.String(36), nullable=False),
        sa.Column("snapshot_date", sa.String(10), nullable=False),
        sa.Column("views", sa.Integer, nullable=False, server_default="0"),
        sa.Column("estimated_minutes_watched", sa.Integer, nullable=False, server_default="0"),
        sa.Column("average_view_duration_seconds", sa.Float, nullable=False, server_default="0"),
        sa.Column("average_view_percentage", sa.Float, nullable=False, server_default="0"),
        sa.Column("subscribers_gained", sa.Integer, nullable=False, server_default="0"),
        sa.Column("subscribers_lost", sa.Integer, nullable=False, server_default="0"),
        sa.Column("likes", sa.Integer, nullable=False, server_default="0"),
        sa.Column("shares", sa.Integer, nullable=False, server_default="0"),
        sa.Column("comments", sa.Integer, nullable=False, server_default="0"),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "platform_connection_id", "snapshot_date",
            name="uq_yt_channel_analytics_conn_date",
        ),
    )
    op.create_index(
        "ix_yt_channel_analytics_daily_conn",
        "youtube_channel_analytics_daily",
        ["platform_connection_id"],
    )
    op.create_index(
        "ix_yt_channel_analytics_daily_date",
        "youtube_channel_analytics_daily",
        ["snapshot_date"],
    )

    op.create_table(
        "youtube_video_analytics_daily",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("platform_connection_id", sa.String(36), nullable=False),
        sa.Column("platform_video_id", sa.String(128), nullable=False),
        sa.Column("snapshot_date", sa.String(10), nullable=False),
        sa.Column("views", sa.Integer, nullable=False, server_default="0"),
        sa.Column("estimated_minutes_watched", sa.Integer, nullable=False, server_default="0"),
        sa.Column("average_view_duration_seconds", sa.Float, nullable=False, server_default="0"),
        sa.Column("average_view_percentage", sa.Float, nullable=False, server_default="0"),
        sa.Column("likes", sa.Integer, nullable=False, server_default="0"),
        sa.Column("shares", sa.Integer, nullable=False, server_default="0"),
        sa.Column("comments", sa.Integer, nullable=False, server_default="0"),
        sa.Column("subscribers_gained", sa.Integer, nullable=False, server_default="0"),
        sa.Column("card_impressions", sa.Integer, nullable=False, server_default="0"),
        sa.Column("card_clicks", sa.Integer, nullable=False, server_default="0"),
        sa.Column("card_click_rate", sa.Float, nullable=False, server_default="0"),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "platform_connection_id", "platform_video_id", "snapshot_date",
            name="uq_yt_video_analytics_conn_vid_date",
        ),
    )
    op.create_index(
        "ix_yt_video_analytics_daily_conn",
        "youtube_video_analytics_daily",
        ["platform_connection_id"],
    )
    op.create_index(
        "ix_yt_video_analytics_daily_vid",
        "youtube_video_analytics_daily",
        ["platform_video_id"],
    )
    op.create_index(
        "ix_yt_video_analytics_daily_date",
        "youtube_video_analytics_daily",
        ["snapshot_date"],
    )

    op.create_table(
        "youtube_audience_retention",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("platform_connection_id", sa.String(36), nullable=False),
        sa.Column("platform_video_id", sa.String(128), nullable=False),
        sa.Column("elapsed_ratio", sa.Float, nullable=False),
        sa.Column("audience_watch_ratio", sa.Float, nullable=False, server_default="0"),
        sa.Column("relative_retention_performance", sa.Float, nullable=False, server_default="0"),
        sa.Column("window_start", sa.String(10), nullable=False),
        sa.Column("window_end", sa.String(10), nullable=False),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "platform_connection_id", "platform_video_id", "elapsed_ratio",
            "window_start", "window_end",
            name="uq_yt_retention_conn_vid_ratio_window",
        ),
    )
    op.create_index(
        "ix_yt_retention_conn",
        "youtube_audience_retention",
        ["platform_connection_id"],
    )
    op.create_index(
        "ix_yt_retention_vid",
        "youtube_audience_retention",
        ["platform_video_id"],
    )

    op.create_table(
        "youtube_demographics_snapshot",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("platform_connection_id", sa.String(36), nullable=False),
        sa.Column("platform_video_id", sa.String(128), nullable=False, server_default=""),
        sa.Column("age_group", sa.String(20), nullable=False),
        sa.Column("gender", sa.String(20), nullable=False),
        sa.Column("viewer_percentage", sa.Float, nullable=False, server_default="0"),
        sa.Column("window_start", sa.String(10), nullable=False),
        sa.Column("window_end", sa.String(10), nullable=False),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "platform_connection_id", "platform_video_id",
            "age_group", "gender", "window_start", "window_end",
            name="uq_yt_demographics_keys",
        ),
    )
    op.create_index(
        "ix_yt_demographics_conn",
        "youtube_demographics_snapshot",
        ["platform_connection_id"],
    )
    op.create_index(
        "ix_yt_demographics_vid",
        "youtube_demographics_snapshot",
        ["platform_video_id"],
    )

    op.create_table(
        "youtube_traffic_source_snapshot",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("platform_connection_id", sa.String(36), nullable=False),
        sa.Column("platform_video_id", sa.String(128), nullable=False, server_default=""),
        sa.Column("traffic_source_type", sa.String(50), nullable=False),
        sa.Column("views", sa.Integer, nullable=False, server_default="0"),
        sa.Column("estimated_minutes_watched", sa.Integer, nullable=False, server_default="0"),
        sa.Column("window_start", sa.String(10), nullable=False),
        sa.Column("window_end", sa.String(10), nullable=False),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "platform_connection_id", "platform_video_id",
            "traffic_source_type", "window_start", "window_end",
            name="uq_yt_traffic_keys",
        ),
    )
    op.create_index(
        "ix_yt_traffic_conn",
        "youtube_traffic_source_snapshot",
        ["platform_connection_id"],
    )
    op.create_index(
        "ix_yt_traffic_vid",
        "youtube_traffic_source_snapshot",
        ["platform_video_id"],
    )

    op.create_table(
        "youtube_device_snapshot",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("platform_connection_id", sa.String(36), nullable=False),
        sa.Column("platform_video_id", sa.String(128), nullable=False, server_default=""),
        sa.Column("device_type", sa.String(30), nullable=False),
        sa.Column("views", sa.Integer, nullable=False, server_default="0"),
        sa.Column("estimated_minutes_watched", sa.Integer, nullable=False, server_default="0"),
        sa.Column("window_start", sa.String(10), nullable=False),
        sa.Column("window_end", sa.String(10), nullable=False),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "platform_connection_id", "platform_video_id",
            "device_type", "window_start", "window_end",
            name="uq_yt_device_keys",
        ),
    )
    op.create_index(
        "ix_yt_device_conn",
        "youtube_device_snapshot",
        ["platform_connection_id"],
    )
    op.create_index(
        "ix_yt_device_vid",
        "youtube_device_snapshot",
        ["platform_video_id"],
    )

    op.create_table(
        "youtube_analytics_sync_log",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("platform_connection_id", sa.String(36), nullable=False),
        sa.Column("run_kind", sa.String(30), nullable=False, server_default="daily"),
        sa.Column("status", sa.String(20), nullable=False, server_default="running"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("videos_synced", sa.Integer, nullable=False, server_default="0"),
        sa.Column("rows_written", sa.Integer, nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("trigger_source", sa.String(30), nullable=False, server_default="scheduler"),
    )
    op.create_index(
        "ix_yt_analytics_sync_log_conn",
        "youtube_analytics_sync_log",
        ["platform_connection_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_yt_analytics_sync_log_conn", table_name="youtube_analytics_sync_log")
    op.drop_table("youtube_analytics_sync_log")
    op.drop_index("ix_yt_device_vid", table_name="youtube_device_snapshot")
    op.drop_index("ix_yt_device_conn", table_name="youtube_device_snapshot")
    op.drop_table("youtube_device_snapshot")
    op.drop_index("ix_yt_traffic_vid", table_name="youtube_traffic_source_snapshot")
    op.drop_index("ix_yt_traffic_conn", table_name="youtube_traffic_source_snapshot")
    op.drop_table("youtube_traffic_source_snapshot")
    op.drop_index("ix_yt_demographics_vid", table_name="youtube_demographics_snapshot")
    op.drop_index("ix_yt_demographics_conn", table_name="youtube_demographics_snapshot")
    op.drop_table("youtube_demographics_snapshot")
    op.drop_index("ix_yt_retention_vid", table_name="youtube_audience_retention")
    op.drop_index("ix_yt_retention_conn", table_name="youtube_audience_retention")
    op.drop_table("youtube_audience_retention")
    op.drop_index("ix_yt_video_analytics_daily_date", table_name="youtube_video_analytics_daily")
    op.drop_index("ix_yt_video_analytics_daily_vid", table_name="youtube_video_analytics_daily")
    op.drop_index("ix_yt_video_analytics_daily_conn", table_name="youtube_video_analytics_daily")
    op.drop_table("youtube_video_analytics_daily")
    op.drop_index("ix_yt_channel_analytics_daily_date", table_name="youtube_channel_analytics_daily")
    op.drop_index("ix_yt_channel_analytics_daily_conn", table_name="youtube_channel_analytics_daily")
    op.drop_table("youtube_channel_analytics_daily")
