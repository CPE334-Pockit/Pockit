"""Build the Lab 5 evidence PDF from verified, synthetic evidence.

Run with the bundled Python runtime (reportlab and Pillow required). Raw browser
screenshots stay in the Git-ignored artifacts/private directory. Only cropped
application pixels are embedded in the output; browser chrome is never read
into the PDF image stream.
"""

from __future__ import annotations

from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[3]
LAB = Path(__file__).resolve().parent
PRIVATE = LAB / "artifacts" / "private"
OUTPUT = ROOT / "output" / "pdf" / "lab5_sec1_PEEEEEEJA.pdf"

FONT_ROOT = Path("/System/Library/Fonts/Supplemental")
pdfmetrics.registerFont(TTFont("ArialLab", str(FONT_ROOT / "Arial.ttf")))
pdfmetrics.registerFont(TTFont("ArialLabBold", str(FONT_ROOT / "Arial Bold.ttf")))
pdfmetrics.registerFontFamily("ArialLab", normal="ArialLab", bold="ArialLabBold")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="TitleLab", fontName="ArialLabBold", fontSize=21, leading=25, textColor=colors.HexColor("#12353b"), spaceAfter=12))
styles.add(ParagraphStyle(name="SectionLab", fontName="ArialLabBold", fontSize=14, leading=18, textColor=colors.HexColor("#12353b"), spaceBefore=10, spaceAfter=9))
styles.add(ParagraphStyle(name="SubLab", fontName="ArialLabBold", fontSize=10, leading=13, textColor=colors.HexColor("#1b5154"), spaceBefore=9, spaceAfter=5))
styles.add(ParagraphStyle(name="BodyLab", fontName="ArialLab", fontSize=9.1, leading=13, spaceAfter=7))
styles.add(ParagraphStyle(name="SmallLab", fontName="ArialLab", fontSize=8, leading=11, spaceAfter=5))
styles.add(ParagraphStyle(name="CaptionLab", fontName="ArialLab", fontSize=7.7, leading=10.5, textColor=colors.HexColor("#425466"), spaceBefore=4, spaceAfter=10))
styles.add(ParagraphStyle(name="CellLab", fontName="ArialLab", fontSize=8, leading=10))
styles.add(ParagraphStyle(name="HeaderCellLab", fontName="ArialLabBold", fontSize=8, leading=10, textColor=colors.white))
styles.add(ParagraphStyle(name="FootLab", fontName="ArialLab", fontSize=7, leading=9, textColor=colors.HexColor("#607080"), alignment=TA_CENTER))


def p(text: str, style: str = "BodyLab") -> Paragraph:
    return Paragraph(text, styles[style])


def link(label: str, url: str) -> str:
    return f'<link href="{escape(url)}" color="#006d77"><u>{escape(label)}</u></link>'


def row(*cells: str, header: bool = False) -> list[Paragraph]:
    return [p(cell, "HeaderCellLab" if header else "CellLab") for cell in cells]


def table(rows: list[list[Paragraph]], widths: list[float]) -> Table:
    t = Table(rows, colWidths=widths, hAlign="LEFT", repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1b5154")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f6f5")]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, 0), 0.6, colors.HexColor("#1b5154")),
    ]))
    return t


def image_crop(path: Path, box: tuple[int, int, int, int], width: float) -> Image:
    with PILImage.open(path) as src:
        crop = src.crop(box).convert("RGB")
        buf = BytesIO()
        crop.save(buf, format="PNG", optimize=True)
        buf.seek(0)
        flow = Image(buf, width=width, height=width * crop.height / crop.width)
        flow._lab_buf = buf  # retain bytes until ReportLab finishes building
        return flow


def screenshot_pair(path: Path, *, new_layout: bool, figure: int, stage: str, sha: str) -> list:
    if new_layout:
        cash = (320, 650, 910, 900)
        activity = (1920, 1110, 2750, 1330)
    else:
        cash = (320, 730, 910, 980)
        activity = (1920, 1190, 2750, 1410)
    if not path.is_file():
        raise FileNotFoundError(f"Required private screenshot missing: {path}")
    panels = table([
        row("Cash on hand", "Recent activity", header=True),
        [image_crop(path, cash, 210), image_crop(path, activity, 275)],
    ], [229, 305])
    return [
        panels,
        p(
            f"Figure {figure}. C-05 (R-04): Pixel-exact app-content crops from one team screenshot {escape(stage)}; "
            f"the synthetic receipt LAB5-PERSIST-20261120 and THB 123.45 balance remain visible. "
            f"Release {escape(sha)}. Browser chrome is omitted.",
            "CaptionLab",
        ),
    ]


def footer(canvas, doc):
    canvas.saveState()
    w, _ = A4
    canvas.setStrokeColor(colors.HexColor("#b7cccb"))
    canvas.line(15 * mm, 15 * mm, w - 15 * mm, 15 * mm)
    canvas.setFont("ArialLab", 7)
    canvas.setFillColor(colors.HexColor("#607080"))
    canvas.drawString(15 * mm, 11 * mm, "CPE 334 | Lab 5 | PEEEEEEJA | 22 Nov 2026")
    canvas.drawRightString(w - 15 * mm, 11 * mm, str(doc.page))
    canvas.restoreState()


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(OUTPUT), pagesize=A4, leftMargin=15 * mm,
                            rightMargin=15 * mm, topMargin=16 * mm, bottomMargin=20 * mm,
                            title="Lab 5 - Pockit evidence index", author="PEEEEEEJA")
    story = []
    add = story.append
    add(p("Lab 5 - Cloud Deployment and CI/CD", "TitleLab"))
    add(p("Answer Part 0: Team and Evidence Index", "SectionLab"))
    add(p("Section 1 | Team PEEEEEEJA | Topic 7: Personal Money and Expense Logging System (Pockit)."))
    add(table([
        row("Student", "ID / GitHub", "Contribution evidence", header=True),
        row("Polwarit Watthanahemmarat", "67070501067<br/>" + link("MadMax168", "https://github.com/MadMax168"), link("PR #57", "https://github.com/CPE334-Pockit/Pockit/pull/57") + "; local Docker, public release and evidence supervision"),
        row("Guntee Doungmanee", "67070501003<br/>" + link("ovenmakemeheat", "https://github.com/ovenmakemeheat"), link("PR #71 review", "https://github.com/CPE334-Pockit/Pockit/pull/71") + "; teammate review and release review"),
    ], [150, 112, 272]))
    add(Spacer(1, 7))
    add(p("Public " + link("repository", "https://github.com/CPE334-Pockit/Pockit") +
          " | " + link("service", "https://s4b043a2c-4d7hbszvwq-as.a.run.app") +
          " | " + link("release PR #72", "https://github.com/CPE334-Pockit/Pockit/pull/72") +
          " | " + link("evidence index", "https://github.com/CPE334-Pockit/Pockit/blob/lab5/docs/labs/lab-05/evidence-index.md") + "."))
    add(p("Running commit: <b>b315c99b7e68ec4061bd131aff016bb19ed6c899</b>. Cloud Run revision: <b>s4b043a2c-00005-qd5</b>, Ready, 100% traffic, verified by the pipeline run and read-only service describe."))
    add(p("Check", "SubLab"))
    add(table([
        row("ID / rubric", "Direct evidence", "Observed result", header=True),
        row("C-01 / Part 1", link("PR #50", "https://github.com/CPE334-Pockit/Pockit/pull/50") + ", " + link("CI 44025791559", "https://github.com/CPE334-Pockit/Pockit/actions/runs/44025791559"), "Build and tests passed; head 3057e867."),
        row("C-02 / Part 1", link("PR #63", "https://github.com/CPE334-Pockit/Pockit/pull/63") + ", " + link("failed CI", "https://github.com/CPE334-Pockit/Pockit/actions/runs/44135270043"), "Required check blocked merge; head 19874207."),
        row("C-03 / Part 2", link("PR #57", "https://github.com/CPE334-Pockit/Pockit/pull/57"), "Clean build, migrations, synthetic seed and running UI/API; 3c7a7e9 + fix 42f67d6."),
        row("C-04 / Part 3", link("service", "https://s4b043a2c-4d7hbszvwq-as.a.run.app") + ", " + link("deployment record", "https://github.com/CPE334-Pockit/Pockit/blob/lab5/docs/labs/lab-05/deployment.md"), "Public sign-in, synthetic receipt, connected DB; unauthorized finance read 401; 5256b3c."),
        row("C-05 / Part 3", link("deploy run 44995350059", "https://github.com/CPE334-Pockit/Pockit/actions/runs/44995350059") + ", Figures 1-3", "Same receipt after restart, manual and pipeline redeploy; 5256b3c / b315c99."),
        row("C-06 / Part 4", link("PR #71", "https://github.com/CPE334-Pockit/Pockit/pull/71") + ", " + link("PR #72", "https://github.com/CPE334-Pockit/Pockit/pull/72") + ", " + link("deploy run", "https://github.com/CPE334-Pockit/Pockit/actions/runs/44995350059"), "Reviewed release deployed successfully; b315c99 revision 00005-qd5."),
    ], [88, 216, 230]))

    add(PageBreak())
    add(p("Answer Part 1: CI and Quality Gate", "SectionLab"))
    add(p(link("CI workflow", "https://github.com/CPE334-Pockit/Pockit/blob/main/.github/workflows/ci-docker.yml") +
          " runs automated tests, type/build checks, Compose validation and Docker image builds on PRs into lab5 and main. " +
          link("PR #50", "https://github.com/CPE334-Pockit/Pockit/pull/50") + " passed " +
          link("CI run 44025791559", "https://github.com/CPE334-Pockit/Pockit/actions/runs/44025791559") +
          " on commit 3057e867b379b017da5a16110afd869c29a694f9 (C-01 / R-05)."))
    add(p("The active " + link("main ruleset", "https://github.com/CPE334-Pockit/Pockit/rules/27470351") +
          " requires a PR, one approval, an up-to-date branch and the real test-and-docker check. Temporary " +
          link("PR #63", "https://github.com/CPE334-Pockit/Pockit/pull/63") + " at 198742072b773dde74474c495360ed6ca11c148b intentionally failed " +
          link("CI run 44135270043", "https://github.com/CPE334-Pockit/Pockit/actions/runs/44135270043") +
          "; GitHub displayed a required failed check and blocked merge. The PR was closed unmerged; the released app was unchanged (C-02 / R-06)."))
    add(p("The new release also passed " + link("main CI 44995349976", "https://github.com/CPE334-Pockit/Pockit/actions/runs/44995349976") +
          " on exact SHA b315c99b7e68ec4061bd131aff016bb19ed6c899 before its deploy workflow touched GCP."))

    add(PageBreak())
    add(p("Answer Part 2: Docker and Reproducible Configuration", "SectionLab"))
    add(p("The public repository contains the root " + link("Dockerfile", "https://github.com/CPE334-Pockit/Pockit/blob/main/Dockerfile") +
          ", " + link(".dockerignore", "https://github.com/CPE334-Pockit/Pockit/blob/main/.dockerignore") +
          ", " + link("Docker Compose", "https://github.com/CPE334-Pockit/Pockit/blob/main/docker-compose.yml") +
          ", and example environment files. No production password, database URL or service-account key is committed (R-01/R-02)."))
    add(p("A fresh checkout at 3c7a7e9 first revealed that Prisma Client generation was missing inside the image. " +
          link("PR #57", "https://github.com/CPE334-Pockit/Pockit/pull/57") +
          " includes the 42f67d6 fix and the recorded commands: Docker Compose build/up, versioned migration, synthetic seed, health/readiness and browser checks. The fixed checkout built both images, applied four migrations, seeded three demo Users and ten accounts, and served API/web HTTP 200 (C-03)."))
    add(p("" + link("Deployment configuration", "https://github.com/CPE334-Pockit/Pockit/blob/lab5/docs/labs/lab-05/deployment.md") +
          " documents build, test, migration and release commands plus each environment variable's purpose/source and secrecy. The university portal supplied one team Cloud SQL instance, registry, migration job, service and Secret Manager references; the workflow updates only those team resources."))
    add(table([
        row("Setting", "Source", "Handling", header=True),
        row("GCP_PROJECT_ID, GCP_REGION", "University portal / GitHub demo variables", "Non-secret names; validated against assigned team project and region."),
        row("WIF_PROVIDER, WIF_SERVICE_ACCOUNT", "University portal / GitHub demo variables", "Identifiers only; keyless federation, no JSON service-account key."),
        row("DATABASE_URL", "Team Secret Manager reference", "Value never copied into Git, logs or report."),
        row("BETTER_AUTH_SECRET", "Team Secret Manager slot 1", "Runtime secret reference; value not displayed."),
        row("Course User password", "Team Secret Manager slot 2", "Bootstrap reads secret reference; value omitted."),
    ], [128, 202, 204]))

    add(PageBreak())
    add(p("Answer Part 3: GCP Deployment and Persistence", "SectionLab"))
    add(p("Public " + link("Pockit URL", "https://s4b043a2c-4d7hbszvwq-as.a.run.app") +
          " serves UI and API in project cpe-se-course-2026, region asia-southeast1, with persistent Cloud SQL. Initial reviewed release 5256b3c was deployed manually; migration and course User bootstrap completed. Public /, /login, /api/health and /api/ready returned HTTP 200, while unauthenticated finance access returned HTTP 401. The team signed in and recorded synthetic Salary transaction LAB5-PERSIST-20261120 for THB 123.45 (C-04 / R-03)."))
    add(p("Cloud Run revisions lab5restart and lab5redeploy each reached Ready/100% with db: connected; a team member reported the same transaction after refreshing on each. No independent image was taken between these two rollouts. A later GitHub Actions release created revision s4b043a2c-00005-qd5 using SHA b315c99; the team supplied a distinct screenshot showing the same transaction afterward (C-05 / R-04)."))
    add(p("The address shown in the original browser screenshot is " +
          link("https://s4b043a2c-4d7hbszvwq-as.a.run.app/dashboard", "https://s4b043a2c-4d7hbszvwq-as.a.run.app/dashboard") +
          ". Figures below use exact pixel crops of Cash on hand and Recent activity; browser chrome and personal bookmarks are excluded."))
    add(Spacer(1, 5))
    add(KeepTogether(screenshot_pair(PRIVATE / "public-income-before-restart-2026-11-20.png", new_layout=False,
                                     figure=1, stage="before the first restart", sha="5256b3c")))
    add(KeepTogether(screenshot_pair(PRIVATE / "public-income-after-redeploy-2026-11-20.png", new_layout=False,
                                     figure=2, stage="after the manual redeploy", sha="5256b3c")))
    add(KeepTogether(screenshot_pair(PRIVATE / "public-income-after-actions-2026-11-22.png", new_layout=True,
                                     figure=3, stage="after the GitHub Actions deploy", sha="b315c99")))

    add(PageBreak())
    add(p("Answer Part 4: Repeatable Release Pipeline", "SectionLab"))
    add(p(link("Implementation PR #71", "https://github.com/CPE334-Pockit/Pockit/pull/71") +
          " put the portal-aligned deploy workflow into lab5 after teammate approval. The separately reviewed " +
          link("release PR #72", "https://github.com/CPE334-Pockit/Pockit/pull/72") +
          " merged lab5 into main at b315c99b7e68ec4061bd131aff016bb19ed6c899. " +
          link("Main CI 44995349976", "https://github.com/CPE334-Pockit/Pockit/actions/runs/44995349976") +
          " passed on that exact commit (R-07/R-09)."))
    add(p(link("Deploy run 44995350059", "https://github.com/CPE334-Pockit/Pockit/actions/runs/44995350059") +
          " passed exact-SHA CI wait, keyless WIF auth, image build/push, additive migration, idempotent bootstrap, service update and public smoke. The image tag includes the full release SHA; read-only gcloud service describe confirmed s4b043a2c-00005-qd5 Ready with 100% traffic. Health returned ok, readiness returned ready/db connected and web root succeeded (C-06 / R-08)."))
    add(p("Repeatable procedure: 1) merge a reviewed issue PR into lab5; 2) open and review a separate lab5 to main release PR; 3) merge after required CI; 4) let the main push workflow wait for CI on the same SHA; 5) inspect WIF, migration, service revision, image tag and smoke in the deploy run. " +
          link("Detailed commands and fallback", "https://github.com/CPE334-Pockit/Pockit/blob/lab5/docs/labs/lab-05/deployment.md") +
          " are documented in deployment.md."))
    add(p("Earlier WIF attempts " + link("44757283437", "https://github.com/CPE334-Pockit/Pockit/actions/runs/44757283437") +
          " and " + link("44757614254", "https://github.com/CPE334-Pockit/Pockit/actions/runs/44757614254") +
          " failed at the course provider's attribute condition. They remain in the history. The later reviewed release succeeded; the exact cause of the earlier rejection was not independently isolated."))
    add(HRFlowable(width="100%", thickness=0.7, color=colors.HexColor("#b7cccb")))
    add(Spacer(1, 7))
    add(p("Evidence limits: the first cloud restart has team observation and revision/readiness evidence but no separate screenshot. The two old after-stage files were byte-identical, so only one is used. The new after-actions screenshot is distinct. No real financial data, credentials or raw browser chrome are included in this PDF.", "SmallLab"))
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(OUTPUT)


if __name__ == "__main__":
    main()
