def sub(f, old, new, imp, count=1):
    s=open(f,encoding='utf-8',newline='').read()
    nl='\r\n' if '\r\n' in s else '\n'
    old=old.replace('\n',nl); new=new.replace('\n',nl)
    assert old in s,(f,old)
    s=s.replace(old,new) if count==0 else s.replace(old,new,count)
    if imp and imp not in s:
        lines=s.split(nl); idx=max(i for i,l in enumerate(lines) if l.startswith('import '))
        lines.insert(idx+1,imp); s=nl.join(lines)
    open(f,'w',encoding='utf-8',newline='').write(s)
I="import { playerBusy, gameBusy } from './busy.js';"
J="import { playerBusy } from './busy.js';"
K="import { gameBusy } from './busy.js';"
import subprocess
def commit(msg):
    subprocess.run(['git','add','-A'],check=True)
    subprocess.run(['git','commit','-qm',msg+" (Refs #105)\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"],check=True)
G='game/js/'
sub('activitykit.js',"  if (isMissionActive() || getActiveRace()) return 'Niet nu: maak eerst je missie af';\n  if (w.sideJob && w.sideJob.active) return 'Niet nu: je bent aan het werk';\n  if (w.challenge) return 'Niet nu: eerst die uitdaging';\n  if (w.padelGame) return 'Niet nu';",
"  if (playerBusy(w, ['mission', 'activeRace']).busy) return 'Niet nu: maak eerst je missie af';\n  if (playerBusy(w, ['sideJob']).busy) return 'Niet nu: je bent aan het werk';\n  if (playerBusy(w, ['challenge']).busy) return 'Niet nu: eerst die uitdaging';\n  if (playerBusy(w, ['padel']).busy) return 'Niet nu';",J)
sub('activitykit.js',"import { isMissionActive, getActiveRace } from './missions.js';\n","",None)
commit("activitykit.activityBlock via playerBusy")
sub('muggings.js',"return isCinematicActive() || isMissionActive() || !!(w.sideJob && w.sideJob.active) || isActivityActive() || !!w.challenge || !!w.race || !!w.padelGame\n","return playerBusy(w, ['cinematic', 'mission', 'sideJob', 'activity', 'challenge', 'race', 'padel']).busy\n",J)
commit("muggings busy via playerBusy")
sub('onboarding.js',"const busy = (w) => missionOn(w) || !!(w.sideJob && w.sideJob.active) || !!w.challenge || !!w.padelGame || !!w.activityGame || !!w.heliRun || !!w.pigeonMode;","const busy = (w) => missionOn(w) || playerBusy(w, ['sideJob', 'challenge', 'padel', 'activityGame', 'heliRun', 'pigeon']).busy;",J)
commit("onboarding busy via playerBusy")
sub('cheats.js',"return isMissionActive() || isCinematicActive() || !!w.challenge || !!(w.sideJob && w.sideJob.active) || !!w.heliRun ||\n    !!w.pigeonMode || !!w.padelGame || isActivityActive() || !!w.trainDriving || !!w.pendingRespawn;","return playerBusy(w, ['mission', 'cinematic', 'challenge', 'sideJob', 'heliRun', 'pigeon', 'padel', 'activity', 'train', 'respawn']).busy;",J)
commit("cheatsBusy via playerBusy")
sub('storyfun.js',"w.padelGame || isCinematicActive() || isMissionActive() || isActivityActive() || w.pigeonMode) return;","playerBusy(w, ['padel', 'cinematic', 'mission', 'activity', 'pigeon']).busy) return;",J)
commit("storyfun court meet via playerBusy")
sub('trafficlaw.js',"if (world.padelGame || world.activityGame || world.challenge || world.cameraOverride) return true;","if (playerBusy(world, ['padel', 'activityGame', 'challenge']).busy || world.cameraOverride) return true;",J)
commit("trafficlaw exempt via playerBusy")
sub('safety.js',"const owned = w.padelGame || w.activityGame || w.heliRun || w.challenge;","const owned = playerBusy(w, ['padel', 'activityGame', 'heliRun', 'challenge']).busy;",J)
commit("safety owned via playerBusy")
for f,old in [('prompts.js',"const gameBusy = !!(world.padelGame || world.activityGame || world.heliRun);"),('scene3d.js',"const gameBusy = !!(world.padelGame || world.activityGame || world.heliRun);"),('hud_panel.js',"const busyGame = !!(world.padelGame || world.activityGame || world.heliRun);")]:
    nm=old.split()[1]
    sub(f,old,f"const {nm} = gameBusy(world);",K,0)
commit("prompts, scene3d, hud_panel: gameBusy")
sub('hud_panel.js',"if (goal && !world.padelGame && !world.activityGame && !world.heliRun && !world.challenge","if (goal && !playerBusy(world, ['padel', 'activityGame', 'heliRun', 'challenge']).busy",J)
sub('hud_panel.js',"!world.storyFreePlay && !world.padelGame && !world.activityGame && !world.heliRun &&","!world.storyFreePlay && !gameBusy(world) &&",None)
sub('missions.js',"else if (world.challenge || world.padelGame || world.activityGame) chain.armed","else if (playerBusy(world, ['challenge', 'padel', 'activityGame']).busy) chain.armed",J)
sub('gamepad.js',"if (w.padelGame || w.activityGame) return 'minigame';","if (playerBusy(w, ['padel', 'activityGame']).busy) return 'minigame';",J)
sub('routing.js',"if (world.padelGame || world.activityGame) return null;","if (playerBusy(world, ['padel', 'activityGame']).busy) return null;",J)
sub('routing.js',"world.pigeonMode || world.heliRun || world.padelGame || world.activityGame ? null","playerBusy(world, ['pigeon', 'heliRun', 'padel', 'activityGame']).busy ? null",None)
sub('scene3d.js',"world.padelGame || world.activityGame || world.heliRun ? null : getUserWaypoint()","gameBusy(world) ? null : getUserWaypoint()",None)
commit("hud_panel, missions, gamepad, routing, scene3d: remaining checks via the gate")
