# LinkUp: two neighbors, one adventure

An Expo app with a shared backend. Two real people match, the local picks or suggests an activity, the newcomer approves it, and both use polls to agree on availability, a time, and the final plan. Photon delivers native iMessage polls. Gemini understands free-text availability, preferences, and activity suggestions.

## Start here

Use this **one folder** for every command. You do not need a separate backend installation.

1. Extract `linkup-demo.zip` and open the `linkup-demo` folder in VS Code.
2. Run:

   ```bash
   npm ci
   npm run setup
   ```

3. Open the real `.env` file created by setup and add your keys:

   ```env
   PROJECT_ID=your_photon_project_id
   PROJECT_SECRET=your_photon_project_secret
   GEMINI_API_KEY=your_google_ai_studio_key
   GEMINI_MODEL=gemini-3.5-flash-lite
   PHOTON_MODE=photon
   PHOTON_POLLS=native
   ```

   Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey). The model is configurable: use a Gemini text model with structured-output access on your account. Old Groq settings are unused and can be removed. `npm run setup` preserves an existing `.env`, so update its values yourself when upgrading. Never put API keys in `EXPO_PUBLIC` variables.

4. Add **both real phone numbers as project users** in your Photon dashboard. Both should receive iMessages on a compatible device. Native polls require a supported Messages version, such as [iOS 26 or later](https://support.apple.com/guide/iphone/poll-people-in-a-conversation-iphde1787df4/ios).
5. Terminal 1: `npm run server`. Wait for **Photon connected**.
6. Terminal 2, in the same folder: `npm start`. Open the QR code in a matching Expo Go version on both phones.

The project uses Expo SDK 57. Use Node **22.13+ on Node 22**, or **24.3+**. Both phones and the laptop must be on the same reachable Wi-Fi. Expo uses port **8081** and the backend uses **8787**. Leave `EXPO_PUBLIC_API_BASE_URL` empty for automatic detection. If necessary, set it to `http://YOUR_MAC_WIFI_IP:8787` and restart Expo. An Expo tunnel does not tunnel the separate backend.

## The new demo flow

1. Register two people with different phone numbers. Choose **Local** for one and **New to the neighborhood** for the other. Pick interests such as Hiking, Exploring, Photography, or Coffee.
2. Swipe left to pass or right to connect on the three sample profiles, then have both real people swipe right on each other. The Pass and Link up buttons perform the same animated action. Samples cannot create a match.
3. Tap **Start polls in Messages**. Both get private introductions. The local gets an activity poll ranked using both profiles' interests, with exploring, hiking, a waterfront walk, park games, coffee, and a custom-suggestion choice.
4. The local chooses an activity. The newcomer receives its meeting point and duration, followed by a **Yes / another activity** poll. A local's choice never counts as the newcomer's approval.
5. Once approved, both receive availability polls. Choose one window or text your own, such as “Tomorrow 2 PM to 6 PM.” Gemini extracts the windows; the backend calculates actual overlap.
6. Both receive the same time choices that fit the activity's duration. If votes differ, the polls stay open. One person can switch to the other's choice or ask for different times. Nothing is chosen automatically in a tie.
7. Both receive the full proposed activity, meeting point, and time, followed by a final confirmation poll. The plan becomes confirmed only after **both confirm the same delivered version**.
8. A final poll offers **All set / Reschedule / Change activity / Cancel**.

You can also vote in the app. Its live poll cards show your recorded response and your partner's planning progress. App votes update the shared backend; they do not impersonate you by adding a vote under your name to Apple's poll UI. Continue with the latest poll when switching between the app and Messages.

All dates and times use **America/New_York**. A hike can take 90 minutes; a custom activity can take 30 to 240 minutes. Outdoor options are scheduled within the demo's fixed 9 AM to 6 PM planning window. This is not a live daylight or weather check.

If both profiles have the same resident type, the first registered local leads, or the first registered participant if neither is local. Both still have to approve the plan.

## Swipe discovery

Drag a profile card right to connect or left to pass. A LINK UP or PASS badge appears as you drag, and the next neighbor is previewed underneath. A short drag snaps back; a deliberate flick or a longer horizontal drag saves the choice. Vertical movement still scrolls the page.

The **Pass** and **Link up** buttons are equivalent alternatives. The card stays offscreen while a decision saves, rapid repeats are blocked, and a failed save returns the card so you can retry. A mutual match requires both real participants to choose each other. Use **Review passed profiles** to revisit a pass before a match forms.

The app is now named **LinkUp** in the interface, Expo configuration, backend messages, and project package. An existing demo login can carry over when updating the same installation. This archive includes no profiles or credentials.

## Local suggestions

The local can use **Suggest an activity** in the app and enter an activity name, public meeting point, duration, and indoor/outdoor choice. Suggestions can also be sent in natural language to Gemini, or in this exact format without an AI request:

```text
SUGGEST: Bookstore hop | Washington Square Arch, NYC | 90 | outdoor
```

If the local adds and votes for a new option in the native activity poll, LinkUp asks for its meeting point and duration before submitting it for approval. A title alone cannot silently become a complete activity. Every new suggestion goes to the newcomer for review and clears old time votes and confirmations. Saved availability is retained.

The curated ideas are NYC starting points. They are not live local search results, verified opening hours, reservations, or ticket bookings. A local can suggest a more convenient place or an indoor alternative. Edit `shared/catalog.ts` to change the initial list.

## Polls and text fallbacks

Native poll creation uses Spectrum's `poll()` builder. Incoming `poll_option` votes and withdrawals are handled directly, without an AI call. Each poll has a unique code, owner, planning round, and options. Votes on an obsolete poll cannot approve a new plan.

Choose **one option per poll**. For time polls, changing your selection is allowed until both people agree. If a final confirmation is withdrawn, the backend revokes the confirmed status and asks both people to confirm a fresh plan version.

For a phone or Photon line that cannot display native polls, set:

```env
PHOTON_POLLS=text
```

Restart the backend. Polls then arrive as numbered text messages. Explicit unsupported-feature errors also fall back to text automatically. Network errors stay failed and can be retried; an uncertain send is not silently repeated in a different format.

Supported replies:

```text
VOTE P1234567890 2
CONFIRM 1
CHANGE ACTIVITY
CHANGE TIME
STOP
```

Replace the poll code, option, or plan number with the one in the latest message. A number by itself works only when exactly one delivered poll is open for you. Poll codes appear in native poll titles and app cards.

Polls and exact commands work even if Gemini is unavailable. A missing Gemini key or account quota affects natural-language replies only. No fallback model or fabricated availability is used.

## Rehearse without sending messages

Set `PHOTON_MODE=console`, restart the backend, and use the app's poll cards and suggestion form. Outbound messages appear only in the backend terminal. You can finish the complete poll flow without Photon or Gemini keys. Use **Switch person on this device** from the portrait menu to operate the two demo accounts.

For another run, use **Restart demo for both people**. This preserves profiles but clears swipes, polls, and the current plan. Both people must match again. Old native polls remain visible in Messages but are no longer accepted.

To use different phone numbers, stop the backend, run `npm run reset-demo`, type RESET, then restart. This only clears local demo data.

If you copy this code into an existing project with old restaurant-planning data, the backend creates a `demo.json.v1-backup`, preserves both profiles and their mutual match, and restarts planning at activity selection. Tap the start button again. Old restaurant confirmations are not carried into the new activity plan.

## Troubleshooting

| Symptom | What to do |
|---|---|
| Cannot reach backend | Keep `npm run server` open. Visit the phone health URL printed in that terminal using `http`. Check Wi-Fi isolation and the API override. |
| Photon not connected | Check `PROJECT_ID` / `PROJECT_SECRET` in `.env` and restart the backend. Existing `SPECTRUM_PROJECT_ID` / `SPECTRUM_PROJECT_SECRET` names also work. |
| Poll or text failed | Check both phone numbers are project users in Photon. Use **Retry failed messages**. Successful messages are not sent again. |
| Native polls unsupported | Use `PHOTON_POLLS=text`, restart, and retry. The same planning rules apply. |
| Gemini HTTP 400 / 403 / 404 | Check your key, account access, and `GEMINI_MODEL`. Use a supported structured-output model. |
| Gemini HTTP 429 | Check account quota or wait, then resend the natural-language reply. Poll votes still work. |
| Old poll says closed | Vote in the newest poll. Changed activity or availability invalidates old choices. |
| No shared time | Pick a wider or different window. Outdoor activities need enough overlap within 9 AM to 6 PM. |
| Port 8787 already in use | Stop the previous backend. Run only one backend and Photon listener. |

## Scope, checks, and files

This remains a two-person hackathon demo. Entering the same phone resumes an account without an OTP; sample portraits are illustrative. Keep the backend on your demo network rather than publishing it unchanged. Phone numbers, tokens, consent, polls, history, and delivery receipts are kept in the gitignored `server/data/demo.json`. No API keys or user data are included in the archive.

The backend serializes mutations and persists polling state. It validates Gemini's output, calculates durations and overlaps in code, and records each participant's own confirmation. A crash precisely between a provider send and the local save can still cause a duplicate on retry; there is no transactional send guarantee.

```bash
npm run typecheck
npm run lint
npm test
```

Tests mock Gemini and Photon and do not contact either service or send texts. They cover native poll payloads and incoming votes, suggestions, approval, mismatched times, retries, withdrawals, stale polls, cancellation, authentication, and migration. Live Gemini account access and iMessage delivery still require your keys and two phones.

`App.tsx` contains the screens; `server/engine.ts` coordinates the polls; `server/gemini.ts` handles natural-language extraction; `server/transport.ts` creates native polls or text fallbacks; `server/index.ts` connects Photon; `shared/catalog.ts` contains the activities. The app checks for state changes every 2.5 seconds and when returning from Messages.

References: [Photon polls](https://photon.codes/docs/spectrum-ts/content/polls), [Photon vote events](https://photon.codes/docs/spectrum-ts/messages), [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/generate-content/structured-output), [Washington Square Park](https://nycgovparks.org/parks/washington-square-park), [The Ramble](https://www.centralparknyc.org/locations/the-ramble), [Pier 45](https://hudsonriverpark.org/locations/pier-45/).
