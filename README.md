# Pathfinder 2nd Edition Playtest Data
The official Foundry module for the latest [Pathfinder 2nd edition playtests](https://paizo.com/pathfinderplaytest)!

Come discuss this module and Pathfinder 2nd edition on [our discord](https://discord.gg/pf2e).

## Issues and Contributions
Please report any issues or data discrepancies on the [issue tracker](https://github.com/TikaelSol/pf2e-playtest-data/issues).

In order to make contributions to the module follow these steps. I assume some familiarity with git and node, if you are new to these things see the [PF2e system's contribution guide](https://github.com/foundryvtt/pf2e/wiki/Helping-with-Data-Entry) for a more in depth walkthrough:

1: Create a fork of this repo and clone it

2: Install [NodeJS](https://nodejs.org/) and [Git](https://git-scm.com/download/win) if they are not already

3: Navigate to your cloned repo and run `npm ci`

4: Run `npm run build` to build the module from the source

5: Make sure Foundry is closed, run `npm run link` then enter the path to your Foundry user data folder (It will look something like this on Windows `C:\Users\YourUsername\AppData\Local\FoundryVTT\Data`). This will delete any existing sf2e folder you have, but will create a symlink between your cloned repo and the Foundry module

6: Make changes inside Foundry, then close Foundry

7: Run `npm run extractPacks` to extract all the changes you made

9: Commit and push, then create a PR
