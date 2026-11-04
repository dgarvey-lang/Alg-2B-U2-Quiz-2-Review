# Algebra 2B · Unit 2 Quiz 2 Review: Radicals & Quadratics

An interactive review page (`index.html`) with 15 practice problems, a **Check work** button on every problem, a built-in scratch pad, and an end-of-review survey.

| Section | Topics | Problems |
|---|---|---|
| 1 | Simplifying square roots (numbers, variables, √ of negatives) | 1–3 |
| 2 | Dividing radicals and rationalizing denominators | 4–5 |
| 3 | Solving quadratics by square rooting (including imaginary solutions) | 6–9 |
| 4 | Solving quadratics by factoring and by square roots | 10–13 |
| 5 | Application (projectile height) | 14 |
| 6 | Characteristics of a parabola from its graph (vertex, axis of symmetry, intercepts, increasing/decreasing, domain, range, and vertex/intercept/standard form) | 15 |
| — | Survey: “What do you need more help on?” | end of page |

## Using it
- **Scratch pad:** a grid-paper drawing area on the right side of the screen. Students can work problems with a finger, stylus, or mouse, using black/blue/red pens, an eraser, Undo, and Clear. It stays open beside the problems on laptops and Chromebooks. On phones, tap **✏️ Scratch pad** in the bottom-right corner to slide it in, and tap **Hide** to close it.
- Open `index.html` in any browser, or turn on **GitHub Pages** (Settings → Pages → Deploy from branch → root) to get a link you can share with students.
- **Check work:** students type their answer and press **Check work** (or Enter). They see one of:
  - ✓ **Correct!**
  - ⚠ **Right value, but not fully simplified**, with a hint (for example, pull out perfect squares, rationalize the denominator, combine like terms, rewrite using *i*)
  - ⚠ **Correct so far, but there's another solution**, or a note that an answer is a rounded decimal instead of exact
  - ✗ **Not quite**, including a note when an answer is extraneous
- A counter at the top shows how many problems they've gotten correct. Worked solutions are not shown.
- **Print worksheet** prints the problems without answer boxes.

## Answer key
The answers are in `checker.js` (the `KEY` table near the top). To change an answer, edit that table.

## Seeing survey results

At the end of the review, students check the topics they want more help with and press **Submit**:
- Solving by factoring when the leading coefficient is 1
- Solving by factoring when the leading coefficient is greater than 1
- Simplifying simple radicals
- Simplifying radicals with variables
- Simplifying radicals with negatives
- Solving a quadratic by square rooting

They can also choose “I feel ready on all of these” and leave a comment.

Each submission becomes one row in a Google Sheet that only you can see. Each row has the student's name, class period, a ✔ under each topic they chose, their comment, and their review score (for example `9 / 15`, plus which problems they got correct).

### One-time setup (about 5 minutes)
1. Create a new Google Sheet (for example “Alg 2B U2 Quiz 2 Survey”).
2. In the Sheet, choose **Extensions → Apps Script**.
3. Delete what's in the editor, paste in everything from [`teacher/survey-apps-script.gs`](teacher/survey-apps-script.gs), and click **Save**.
4. Click **Deploy → New deployment**. Click the gear next to “Select type” and choose **Web app**. Then set:
   - **Execute as:** Me
   - **Who has access:** Anyone (so students don't need to sign in)
5. Click **Deploy**, approve the permissions Google asks for, and copy the **Web app URL** (it ends in `/exec`).
6. Put that URL in `survey.js` between the quotes on the line `const SURVEY_URL = '';`. You can edit the file on GitHub with the pencil icon, or send the URL to Claude to add.

The first submission creates a **Responses** tab in the Sheet. Sort or filter by any topic column to see who needs help with it.

Until step 6 is done, students who press Submit see “This survey isn't connected yet.”

**Notes**
- If you later change the Apps Script, use **Deploy → Manage deployments → Edit → New version** so the URL stays the same.
- Anyone who has the page link could send a response, so treat names as self-reported.
- After an update, the live page can take a few minutes to change. If it still looks old, check the repository's **Actions** tab for a green “pages build and deployment” run.
