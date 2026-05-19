from django.core.management.base import BaseCommand

from users.models import Branch, Program, School


UNIVERSITY_HIERARCHY = [
    {
        "name": "School of Engineering & Technology",
        "code": "SOET",
        "programs": [
            {
                "name": "Bachelor of Engineering & Technology",
                "code": "BTech",
                "branches": [
                    ("Computer Science and Engineering", "CSE"),
                    ("Artificial Intelligence & Machine Learning", "AIML"),
                    ("Artificial Intelligence & Machine Learning (CoE)", "AIML(CoE)"),
                    ("Data Science", "DSML"),
                    ("Information Technology", "IT"),
                    ("Cyber Security", "CY"),
                    ("Cloud Computing", "CC"),
                    ("Electronics & Communication Engineering", "ECE"),
                    ("Electrical Engineering", "EE"),
                    ("Mechanical Engineering", "ME"),
                    ("Civil Engineering", "CIVIL"),
                    ("Agriculture Engineering", "AG"),
                ],
            },
            {"name": "Bachelors of Computer Application", "code": "BCA", "branches": [("Computer Application", "CA")]},
            {"name": "Master of Computer Applications", "code": "MCA", "branches": [("Computer Applications", "CA")]},
            {"name": "PhD", "code": "PhD", "branches": [("Computer Science and Engineering", "CSE"), ("Electrical Engineering", "EE")]},
        ],
    },
    {
        "name": "School of Management & Commerce",
        "code": "SOM",
        "programs": [
            {"name": "Bachelor of Business Administration", "code": "BBA", "branches": [("Bachelor of Business Administration", "BBA")]},
            {"name": "Bachelor of Commerce", "code": "B.Com", "branches": [("Bachelor of Commerce", "B.Com")]},
            {"name": "Master of Business Administration", "code": "MBA", "branches": [("MBA Dual", "MBA_DUAL"), ("Agri Business", "AGRI_BUSINESS")]},
        ],
    },
    {
        "name": "School of Pharmacy",
        "code": "SOP",
        "programs": [
            {"name": "Bachelor of Pharmacy", "code": "BPharm", "branches": [("Bachelor of Pharmacy", "BPharm")]},
            {"name": "Diploma in Pharmacy", "code": "DPharm", "branches": [("Diploma in Pharmacy", "DPharm")]},
            {"name": "Doctor of Pharmacy", "code": "PharmD", "branches": [("Doctor of Pharmacy", "PharmD")]},
            {"name": "PhD", "code": "PhD", "branches": [("Pharmacy", "PHARMACY")]},
        ],
    },
    {
        "name": "School of Science",
        "code": "SOS",
        "programs": [
            {"name": "BSc Computer Science", "code": "BSc_CS", "branches": [("BSc Computer Science", "BSc_CS")]},
            {"name": "BSc Forensic Science", "code": "BSc_FS", "branches": [("BSc Forensic Science", "BSc_FS")]},
            {"name": "BSc Food Technology", "code": "BSc_FT", "branches": [("BSc Food Technology", "BSc_FT")]},
            {"name": "BSc Biotechnology", "code": "BSc_BT", "branches": [("BSc Biotechnology", "BSc_BT")]},
            {"name": "BSc Microbiology", "code": "BSc_MB", "branches": [("BSc Microbiology", "BSc_MB")]},
            {"name": "MSc Food Technology", "code": "MSc_FT", "branches": [("MSc Food Technology", "MSc_FT")]},
            {"name": "MSc Biotechnology", "code": "MSc_BT", "branches": [("MSc Biotechnology", "MSc_BT")]},
        ],
    },
    {
        "name": "School of Agriculture",
        "code": "SOAG",
        "programs": [
            {"name": "BSc Agriculture", "code": "BSc_AG", "branches": [("BSc Agriculture", "BSc_AG")]},
            {"name": "BFSC", "code": "BFSC", "branches": [("Fisheries", "FISHERIES")]},
            {"name": "MSc Agriculture", "code": "MSc_AG", "branches": [("Agronomy", "AGRONOMY"), ("Genetics and Plant Breeding", "GPB")]},
            {"name": "MSc Horticulture", "code": "MSc_HORT", "branches": [("MSc Horticulture", "MSc_HORT"), ("Vegetable Science", "VEG_SCI")]},
        ],
    },
    {
        "name": "School of Architecture",
        "code": "SOA",
        "programs": [{"name": "Architecture Programs", "code": "ARCH", "branches": [("Architecture Programs", "ARCH")]}],
    },
    {
        "name": "School of Education",
        "code": "SOE",
        "programs": [{"name": "Education Programs", "code": "EDU", "branches": [("Education Programs", "EDU")]}],
    },
    {
        "name": "School of Nursing Science",
        "code": "SONS",
        "programs": [{"name": "BSc Nursing", "code": "BSc_NURSING", "branches": [("BSc Nursing", "BSc_NURSING")]}],
    },
    {
        "name": "School of Art & Design",
        "code": "SOAD",
        "programs": [
            {"name": "BSc Fashion Design", "code": "BSc_FD", "branches": [("BSc Fashion Design", "BSc_FD")]},
            {"name": "BSc Interior Design", "code": "BSc_ID", "branches": [("BSc Interior Design", "BSc_ID")]},
        ],
    },
    {
        "name": "School of Journalism & Mass Communication",
        "code": "SOJMC",
        "programs": [
            {"name": "BA Journalism and Mass Communication", "code": "BAJMC", "branches": [("Journalism and Mass Communication", "JMC")]},
            {"name": "PhD", "code": "PhD", "branches": [("Journalism and Mass Communication", "JMC")]},
        ],
    },
    {
        "name": "School of Physical Education & Sport",
        "code": "SOSE",
        "programs": [
            {"name": "Bachelor of Physical Education", "code": "BPEd", "branches": [("Physical Education", "PE")]},
            {"name": "Bachelor of Physical Education and Sports", "code": "BPES", "branches": [("Physical Education and Sports", "PES")]},
            {"name": "PhD", "code": "PhD", "branches": [("Physical Education", "PE")]},
        ],
    },
    {
        "name": "School of Law",
        "code": "SOL",
        "programs": [
            {"name": "BALLB (Hons)", "code": "BALLB_HONS", "branches": [("BALLB Hons", "BALLB_HONS")]},
            {"name": "BBALLB (Hons)", "code": "BBALLB_HONS", "branches": [("BBALLB Hons", "BBALLB_HONS")]},
            {"name": "BCOMLLB (Hons)", "code": "BCOMLLB_HONS", "branches": [("BCOMLLB Hons", "BCOMLLB_HONS")]},
            {"name": "LLB (Hons)", "code": "LLB_HONS", "branches": [("LLB Hons", "LLB_HONS")]},
        ],
    },
    {
        "name": "School of Medical and Paramedical Sciences",
        "code": "SOMPS",
        "programs": [
            {"name": "Bachelor of Physiotherapy", "code": "BPT", "branches": [("Physiotherapy", "PHYSIOTHERAPY")]},
            {"name": "Bachelor of Medical Laboratory Technology", "code": "BMLT", "branches": [("Medical Laboratory Technology", "MLT")]},
        ],
    },
]


class Command(BaseCommand):
    help = "Seed QuizVerse school, program, and branch hierarchy."

    def handle(self, *args, **options):
        schools = programs = branches = 0

        for school_data in UNIVERSITY_HIERARCHY:
            school, created = School.objects.update_or_create(
                school_code=school_data["code"],
                defaults={"school_name": school_data["name"]},
            )
            schools += int(created)

            for program_data in school_data["programs"]:
                program, created = Program.objects.update_or_create(
                    school=school,
                    program_code=program_data["code"],
                    defaults={"program_name": program_data["name"]},
                )
                programs += int(created)

                for branch_name, branch_code in program_data["branches"]:
                    _, created = Branch.objects.update_or_create(
                        program=program,
                        branch_code=branch_code,
                        defaults={"branch_name": branch_name},
                    )
                    branches += int(created)

        self.stdout.write(
            self.style.SUCCESS(
                f"University hierarchy seeded. Created {schools} schools, {programs} programs, {branches} branches."
            )
        )
