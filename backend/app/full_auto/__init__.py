"""Full-Auto Mode — project-level auto-run layer (v1).

This module is a NEW layer on top of the existing ``app.automation`` package.
``app.automation`` manages channel-scope checkpoint policies. ``app.full_auto``
manages project-scope full-auto + cron scheduling for MVP modules (v1: only
``standard_video``).

The two layers coexist: full-auto still respects channel review gates when
enabled, and it never bypasses job engine state machines or security guards.
"""
