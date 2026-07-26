# AimToGro demo videos

Sixteen 30-second product demos (1600×900 MP4/H.264, silent), one per screen/AI employee, in the AimToGro brand (ink navy, green/aqua/yellow, Outfit). Each video: branded intro card → simulated in-app interaction with a live cursor → "Your AI business co-pilot" end card. The app shell (sidebar with goal card, Daily Meeting · CEO, team roster, topbar) mirrors the real dashboard screenshots; demo data uses a fictional "Beacon Home Services."

| Video | Screen |
|---|---|
| `aimtogro-dashboard-demo.mp4` | Team dashboard — pipeline stats, pinned workflows, team cards |
| `aimtogro-ceo-demo.mp4` | Daily Meeting · CEO — standup chat, goal progress, one-tap delegation |
| `aimtogro-sales-rep-demo.mp4` | AI Sales Rep — stale quote chased with a drafted follow-up |
| `aimtogro-marketer-demo.mp4` | AI Marketer — review engine + social post approval |
| `aimtogro-concierge-demo.mp4` | AI Concierge — 9:42 PM website chat books a real job |
| `aimtogro-accountant-demo.mp4` | AI Accountant — overdue invoice reminder → paid & reconciled |
| `aimtogro-ops-manager-demo.mp4` | AI Ops Manager — materials shortfall fixed in three steps |
| `aimtogro-secretary-demo.mp4` | AI Secretary — missed call → auto-text-back → lead created |
| `aimtogro-hr-demo.mp4` | AI HR — onboarding checklist + timesheet approval |
| `aimtogro-settings-demo.mp4` | Settings — phone verify, SMS alert toggles, quiet hours |
| `aimtogro-crm-contacts-demo.mp4` | CRM · Contacts — search, contact card, AI-kept notes, VIP tag |
| `aimtogro-crm-leads-demo.mp4` | CRM · Leads — kanban; missed call becomes a moving lead |
| `aimtogro-jobs-routing-demo.mp4` | Jobs · Routing — one-tap route optimization on the map |
| `aimtogro-calendar-demo.mp4` | Calendar — drag a job, confirmation text writes itself |
| `aimtogro-command-center-demo.mp4` | Command center — pin widgets, customize the layout |
| `aimtogro-pnl-receipts-demo.mp4` | P&L + receipts — receipt scanned, categorized, P&L updates |

## Re-rendering

Scenes are animated HTML in `source/` (shared shell/engine in `a2g.js`/`a2g.css`, scenes in `scenes-core.js` + `scenes-team.js`, played via `player.html?scene=<name>`):

```
cd aimtogro-demos/source
node record.js                        # all 16 → source/out/
SCENES=ceo,calendar node record.js    # specific scenes
```

Requires global playwright + a full ffmpeg (set FFMPEG env var if not at the imageio-ffmpeg path). Shorter takes are padded to exactly 30s by holding the end card (tpad clone).
