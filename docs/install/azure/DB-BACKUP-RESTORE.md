We're running the database out of Docker Compose for the pilot. I don't fully trust Docker Compose with databases. Therefore, we need a more robust means of backing up and restoring our data.

# Pre-work

All of the following commands need to be entered into the command line on Azure, and require the app be up and running in Docker. First, go into the openopps project directory.

```sh
cd /home/openopps/openopps-platform
```

To check which services are running within Docker, run the following.

```sh
docker-compose ps
```

If the list is empty, or if all services are listed as *Exit*, that means your app is not running. Go ahead and run `npm run docker:up` to bring the app back up. Re-run `docker-compose ps` when ready.

# Backing up

There's an npm script for backing up the database. **Note that this command will only work in Linux; it barfs when you try it on Windows.**

```sh
npm run docker:db:backup
```

This will create a full backup of the database at the current point in time. Weekly backups of the database can be found in the following directory on our Azure instance: `/home/openopps/db-backups`.

# Disconnecting

Before dropping or restoring a database, it's important to shut down any services that are connected to the database. We can check with the following command.

```sh
docker-compose ps
```

Check to see if `app`, `init_db`, and/or `migrate_db` are listed as *Up*. If so, you'll need to bring them down before doing any database restoration. Run whichever of the following commands are needed.

```sh
docker-compose stop app
docker-compose stop init_db
docker-compose stop migrate_db
```

Meanwhile, if `db` is listed as *Exit*, then you'll need to bring it back up.

```sh
docker-compose start db
```

# Dropping

If you need to delete the database for whatever reason, here's the command to do it. **Proceed with caution.**

```sh
docker-compose exec db psql -U midas -d database -c 'DROP DATABASE midas'
```

# Restoring

Finally, the next command will restore the database from a backup. `{{FILENAME}}` should be replaced with the name of the backup file from which you would like to restore the database.

```sh
docker-compose exec -i db pg_restore -U midas -C -d postgres < /home/openopps/db-backups/{{FILENAME}}.dump
```

# Running

Once the database is restored, restart the app.

```sh
docker-compose start app
```

# Automating

We can do some additional work to automate database backups within Ubuntu on Azure. This can be done by setting up a `cron` job. To do this, enter the following command.

```sh
crontab -e
```

If you're asked to choose an editor, pick what you prefer. I tend to prefer *vim*, but *nano* is a better choice for beginners. So go with *nano*. A text document will appear with instructions about how to record new cron jobs. Go to the bottom and enter the following (absurdly long) line.

```sh
0 2 * * 1 env DB_USER=$DB_USER DB_NAME=$DB_NAME DB_PASSWORD=$DB_PASSWORD /usr/local/bin/docker-compose -f /home/openopps/openopps-platform/docker-compose.yml -f /home/openopps/openopps-platform/docker-compose.azure.yml -p openopps-platform-azure exec -T db pg_dump -U midas -Fc midas > /home/openopps/db-backups/$(date +\%Y\%m\%d-\%H\%M\%S).dump 2>&1 | logger -t cron_db_backup

```

This will instruct `cron` to backup the database every Sunday morning at 2:00 am. Press `Ctrl-Shift-x` to exit, then `Y` to confirm the save. If you get a request for the filename and a bunch of commands, just hit `Enter`. To confirm the change, you can view the crontab (without editing) with the next command.

```sh
crontab -l
```

# Checking

Review backup history by going to the backups folder.

```sh
cd /home/openopps/db-backups
ls -ltr
```

Make sure you go back to the project folder if you need to retry any of the commands above.

```sh
cd /home/openopps/openopps-platform
```

# Archive Uploaded Files

Before we make our grand exit, we should also make sure we back up files uploaded by users. This might include profile pictures and other task artifacts. The following command performs the backup.

```sh
rsync -a /home/openopps/openopps-platform/assets/uploads/ /home/openopps/uploads-archive
```

The uploads will be archived to the following folder.

```sh
cd /home/openopps/openopps-platform
```

And we can also set this up in `cron` for automated backup. Enter the following line at the bottom of `crontab -e`, per the instructions above, to automatically archive uploads every Sunday at 2:10 am.

```sh
10 2 * * 1 rsync -a /home/openopps/openopps-platform/assets/uploads/ /home/openopps/uploads-archive
```

# Fin

This should put us in an acceptable position for the pilot.
