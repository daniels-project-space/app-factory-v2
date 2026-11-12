# Production deployment

## Release flow

The production source is the `main` branch of this repository. Local commits are deployed after they are pushed to `main`; unpushed commits are not visible to the VPS.

The VPS checks `main` about every five minutes. For a new commit, it creates a clean Node.js 24 install and production build, with the build limited to two CPU cores and 4 GiB of memory. Before releasing, it verifies that production configuration still matches the Vercel project. Configuration values and credentials stay on the server and must not be committed here.

The existing Vercel URL remains the public entry point and forwards application requests to the VPS. Vercel no longer builds or runs this application. The VPS switches to a release only after the production build succeeds and its health checks pass. It retains the previous successful release; failed checks restore that release automatically.

## Manual rollback

Run this on the VPS to restore the previous successful release:

```sh
sudo /usr/local/lib/app-factory-vps/update.py rollback
```

The rollback verifies the restored release before finishing. The update monitor can then deploy the latest `main` commit again.
