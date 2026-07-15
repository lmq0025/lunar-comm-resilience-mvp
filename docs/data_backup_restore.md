# Data Backup, Restore, and Reset

Backup:

```bat
scripts\backup_local_data.bat
```

Restore:

```bat
scripts\restore_local_data.bat C:\path\to\backup
```

Reset:

```bat
scripts\reset_local_data.bat
```

Reset requires typing `YES`. These scripts operate on `LUNAR_APP_DATA_DIR` when set, otherwise `%LOCALAPPDATA%\LunarCommMVP`.
