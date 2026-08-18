SELECT cron.unschedule(29);
SELECT cron.unschedule(54);
SELECT cron.unschedule(46);
SELECT cron.alter_job(49, schedule => '*/2 * * * *');
SELECT cron.alter_job(72, schedule => '*/5 * * * *');