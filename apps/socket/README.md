# @protoshock/socket
Dedicated gameserver for ProtoShock

Allthough this project is a complete rewrite parts and inspiration of this project came from the original ProtoShock/Server-Files (Created by Bracked).

Notable changes for the Socket Server compared to the original
- Written in TypeScript
- Uses uWebsockets for performance improvements
- Custom event handlers, middlewares, and (upcomming) extendable API for plugin development
- WebUI and Socket have been split into different parts (Still in the same turborepo)
- General performance improvements, stability, code cleanup & standards.
- (maybe) switching to Bun owo