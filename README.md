# protoshock server - sex update

# @protoshock/socket
Dedicated gameserver for ProtoShock

Allthough this project is a complete rewrite parts and inspiration of this project came from the original ProtoShock/Server-Files (Created by Bracket & Gizzy).

Notable changes for the Socket Server compared to the original
- Written in TypeScript
- Uses uWebsockets for performance improvements
- Custom event handlers, middlewares, and extendable API for plugin development
- WebUI and Socket have been split into different parts (Still in the same turborepo)
- General performance improvements, stability, code cleanup & standards.
- Example features added: Commands, Motion Smoothing, Chat Filter, Rate Limiting, Anti Cheat, more

# @protoshock/web
> WebUI for protoshock server - also functions as the internal proxy (proxies socket.io from this port to the actual socket server)

Notable changes compared to the original
- Written in TypeScript, uses NextJS, TailwindCSS, shadcn/ui
- Both normal server status page, admin dashboard behind auth
- See chats from all rooms, Send messages, Kick players, Close rooms
- Gay

# @protoshock/database
> simple shared database, not being used for much yet except storing web admin password

# How to run
> NOT VERY USER FRIENDLY YET!

* Clone repo
* run setup.sh (if it doesnt work, install drizzle-kit and turbo (`npm i turbo drizzle-kit`), go to the packages/database dir and run `npm run migrate`)
* Configure ENV vars for both projects in ./apps and the database in packages/database - There should be example files. We need for both production and development.
* in the root dir (here) run `npm run build` to build everything
* and then run `npm run start` to start everything.
* profit