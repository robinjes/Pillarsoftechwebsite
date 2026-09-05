import {
  formatDiscordSetupReport,
  runDiscordChatSetupCheck,
} from '../src/lib/chat-discord-setup.mts'

const report = await runDiscordChatSetupCheck()
console.log(formatDiscordSetupReport(report))
if (report.status !== 'pass') process.exitCode = 1
