# P0-A1 — Authenticated Workspace Transition Matrix V1

Status: Captured / baseline accepted  
Program: Issue #37 — P0 Workspace Performance & Invitation Layout Recovery  
Measured application: `58433f37b53625f280af2991002625fd978592d2`  
Workflow run: `30509655695`  
Vercel deployment: `dpl_5WEm57dyevgagyQZMTGEs5gzJDGQ` (`sin1`)

## Objective

Measure the real authenticated owner-workspace transition cost before changing navigation prefetch, shared-layout data boundaries, cache policy, readiness composition, or editor behavior.

The matrix uses a real owner session against a frozen preview deployment. It contains no account ID, project ID, guest ID, capability token, invitation content, or response content.

## Method

- Desktop profile: Playwright Desktop Chrome.
- Mobile profile: Playwright Pixel 7.
- One complete unrecorded warm-up cycle per profile.
- Three recorded warm client-navigation cycles for each of five transitions.
- Total recorded measurements: 30.
- Timing starts on the canonical workspace-link action and completes when the destination `WorkspacePage` commits and reaches the next animation frame.
- Dynamic project paths are normalized to `/dashboard/:projectId/...` before metrics are emitted.

## Authenticated warm-transition matrix

| Device  | Transition               | Total-ms samples   |  Median |      P75 | Median RSC requests | Median RSC bytes | Median RSC duration |
| ------- | ------------------------ | ------------------ | ------: | -------: | ------------------: | ---------------: | ------------------: |
| Desktop | Ringkasan → Undangan     | 1014 / 1062 / 936  | 1014 ms |  1038 ms |                   1 |           2542 B |             1000 ms |
| Desktop | Undangan → Tamu          | 953 / 815 / 616    |  815 ms |   884 ms |                   1 |           1679 B |              803 ms |
| Desktop | Tamu → Bagikan           | 1037 / 1134 / 1164 | 1134 ms |  1149 ms |                   1 |           1824 B |             1110 ms |
| Desktop | Bagikan → Respons Tamu   | 913 / 912 / 746    |  912 ms | 912.5 ms |                   1 |           1727 B |              896 ms |
| Desktop | Respons Tamu → Ringkasan | 1078 / 1012 / 834  | 1012 ms |  1045 ms |                   1 |           2935 B |              993 ms |
| Mobile  | Ringkasan → Undangan     | 813 / 1044 / 891   |  891 ms | 967.5 ms |                   1 |           2560 B |              867 ms |
| Mobile  | Undangan → Tamu          | 909 / 944 / 810    |  909 ms | 926.5 ms |                   1 |           1680 B |              897 ms |
| Mobile  | Tamu → Bagikan           | 1077 / 1505 / 1305 | 1305 ms |  1405 ms |                   1 |           1824 B |             1295 ms |
| Mobile  | Bagikan → Respons Tamu   | 740 / 938 / 743    |  743 ms | 840.5 ms |                   1 |           1729 B |              730 ms |
| Mobile  | Respons Tamu → Ringkasan | 1060 / 908 / 1026  | 1026 ms |  1043 ms |                   1 |           2935 B |             1018 ms |

Across all 15 recorded transitions per profile:

| Device  | Overall median | Overall P75 | Minimum | Maximum |
| ------- | -------------: | ----------: | ------: | ------: |
| Desktop |         953 ms |   1049.5 ms |  616 ms | 1164 ms |
| Mobile  |         938 ms |     1052 ms |  740 ms | 1505 ms |

## Findings

### 1. Warm navigation is materially too slow

Every transition requires approximately 0.6–1.5 seconds before the destination workspace is ready. Overall p75 is about 1.05 seconds on both desktop and mobile, well above the P0 target for immediate-feeling workspace navigation.

### 2. RSC server duration dominates the interaction

Each recorded transition uses one RSC request, but its duration is usually nearly the entire client-observed total. Payloads are small—approximately 1.7–2.9 KB—so the primary problem is not transfer size. The dominant cost is server work performed before the response becomes usable.

This supports the existing architecture diagnosis:

- the shared project layout loads full wedding readiness;
- destination loaders independently load their own owner context and datasets;
- readiness includes draft, publication, payment, and a nine-query aggregate batch;
- `prefetch={false}` prevents useful route work from beginning before the click.

### 3. Tamu → Bagikan is the highest-priority transition

`Tamu → Bagikan` is the slowest path on both profiles:

- desktop median: 1134 ms; p75: 1149 ms;
- mobile median: 1305 ms; p75: 1405 ms.

The Bagikan route currently waits for full readiness before loading its delivery dataset, making it the clearest first proof point for data-boundary recovery.

### 4. Ringkasan remains expensive despite a small response

`Respons Tamu → Ringkasan` transfers only about 2.9 KB but still takes approximately one second. This confirms that the Ringkasan/readiness computation cost is not explained by payload size.

### 5. Mobile bottom navigation has a real hit-target obstruction

During the first authenticated Pixel 7 run, a normal tap on the mobile `Tamu` link was repeatedly intercepted by the workspace content subtree. The link existed and resolved correctly, but content painted above it captured pointer events.

The successful timing run used a Playwright forced click only inside the temporary measurement workflow. The product source remained unchanged, so this obstruction is preserved as baseline evidence rather than hidden by the measurement.

P0-A2 must make the bottom navigation physically tappable at all times through correct stacking, safe-area spacing, and content-bottom clearance. A forced click is not an acceptable product fix.

## P0-A2/A3 implementation requirements derived from evidence

### Navigation recovery

- remove blanket `prefetch={false}` from the five canonical workspace links;
- restore intentional Next.js route prefetch without exposing private data outside the owner session;
- provide immediate pending feedback on click, keyboard activation, and touch;
- retain the project shell and navigation while destination content streams;
- repair mobile bottom-nav stacking and reserve sufficient content-bottom space;
- add a browser regression proving every bottom-nav destination is normally clickable on Pixel 7.

### Data-boundary recovery

- stop loading full wedding readiness in the shared project layout;
- introduce a lightweight owner-verified project-shell projection for couple identity and truthful compact status;
- reuse request-local verified project context rather than re-verifying the same project in destination loaders;
- use verified-project readiness loaders where full readiness is genuinely required;
- prevent Bagikan from paying full readiness plus delivery-data cost serially when only publication eligibility is needed;
- preserve authorization, publication, payment, RSVP, Guestbook, and guest-link semantics.

## Comparison gate for P0-A2/A3

After A2/A3 is deployed, repeat the identical 30-measurement protocol against a frozen preview and compare each transition with this baseline.

Acceptance targets:

- immediate visual acknowledgement after workspace activation;
- warm route shell visible below 300 ms;
- useful destination content below 800 ms on ordinary conditions;
- p75 interaction-to-next-paint below 200 ms for the pending/navigation response;
- no duplicate full-readiness batch during a single transition;
- mobile bottom navigation receives ordinary pointer clicks without force;
- no privacy, authorization, payment, publication, RSVP, Guestbook, or guest-link regression.
