import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const courses = [
        { code: "CS0.101", name: "Computer Programming", branch: "CSE Core" },
        { code: "CS1.201", name: "Data Structures and Algorithms", branch: "CSE Core" },
        { code: "CS6.201", name: "Introduction to Software Systems", branch: "CSE Core" },
        { code: "CS2.201", name: "Computer Systems Organization", branch: "CSE Core" },
        { code: "CS1.301", name: "Algorithm Analysis and Design", branch: "CSE Core" },
        { code: "CS1.302", name: "Automata Theory", branch: "CSE Core" },
        { code: "CS3.301", name: "Operating Systems and Networks", branch: "CSE Core" },
        { code: "CS4.301", name: "Data and Applications (DBMS)", branch: "CSE Core" },
        { code: "CS6.301", name: "Design and Analysis of Software Systems", branch: "CSE Core" },
        { code: "CS7.301", name: "Machine, Data and Learning", branch: "CSE Core" },
        { code: "CS3.303", name: "Introduction to IoT", branch: "CSE Core" },
        { code: "CS6.302", name: "Software Systems Development", branch: "PG/M.Tech Core" },
        { code: "CS3.304", name: "Advanced Operating Systems", branch: "PG Elective" },
        { code: "CS7.401", name: "Introduction to NLP", branch: "CLD/CSE Elective" },
        { code: "CS7.501", name: "Advanced NLP", branch: "Research Elective" },
        { code: "CS4.406", name: "Information Retrieval & Extraction", branch: "Research Elective" },
        { code: "CS8.501", name: "Research in Information Security", branch: "M.Tech (CSIS)" },
        { code: "CS3.402", name: "Advanced Computer Networks", branch: "M.Tech (CSIS)" },
        { code: "EC2.101", name: "Digital Systems and Microcontrollers", branch: "ECE Core" },
        { code: "EC5.101", name: "Networks, Signals and Systems", branch: "ECE Core" },
        { code: "EC2.102", name: "Electronic Workshop-1", branch: "ECE Core" },
        { code: "EC2.103", name: "Analog Electronic Circuits", branch: "ECE Core" },
        { code: "EC5.102", name: "Information and Communication", branch: "ECE Core" },
        { code: "EC5.201", name: "Signal Processing", branch: "ECE Core" },
        { code: "EC6.201", name: "VLSI Design", branch: "ECE Core" },
        { code: "EC2.202", name: "Electronic Workshop-2", branch: "ECE Core" },
        { code: "EC5.203", name: "Communication Theory", branch: "ECE Core" },
        { code: "EC6.202", name: "Intro to Processor Architecture", branch: "ECE Core" },
        { code: "EC3.202", name: "Embedded Systems Workshop", branch: "ECE/CSE Core" },
        { code: "EC5.408", name: "Speech Signal Processing", branch: "CLD/ECE Elective" },
        { code: "MA5.101", name: "Discrete Structures", branch: "Maths Core" },
        { code: "MA4.101", name: "Real Analysis", branch: "Maths Core" },
        { code: "MA2.101", name: "Linear Algebra", branch: "Maths Core" },
        { code: "MA6.101", name: "Probability and Statistics", branch: "Maths Core" },
        { code: "MA6.102", name: "Probability and Random Processes", branch: "ECE/Maths" },
        { code: "SC4.101", name: "Computing in Sciences-1", branch: "CND Core" },
        { code: "SC4.102", name: "Computing in Sciences-2", branch: "CND Core" },
        { code: "SC1.102", name: "Classical Mechanics", branch: "CND Core" },
        { code: "SC1.101", name: "Electrodynamics", branch: "CND Core" },
        { code: "SC2.101", name: "General & Structural Chemistry", branch: "CND Core" },
        { code: "SC1.110", name: "Science-1", branch: "Institute Core" },
        { code: "SC1.111", name: "Science-2", branch: "Institute Core" },
        { code: "CL1.101", name: "Introduction to Linguistics-1", branch: "CLD Core" },
        { code: "CL1.102", name: "Introduction to Linguistics-2", branch: "CLD Core" },
        { code: "CL3.101", name: "Comp. Phonology & Morphology", branch: "CLD Core" },
        { code: "CL3.202", name: "Comp. Semantics & Discourse Parsing", branch: "CLD Core" },
        { code: "CL1.204", name: "Language Typology and Universals", branch: "CLD Core" },
        { code: "CL2.203", name: "Language and Society", branch: "CLD Core" },
        { code: "HS8.101", name: "Making of the Contemporary World", branch: "Humanities Core" },
        { code: "HS4.102", name: "Making of Contemporary India", branch: "Humanities Core" },
        { code: "HS0.201", name: "Thinking & Knowing in Human Sciences", branch: "Humanities Core" },
        { code: "HS8.102", name: "Intro to Human Sciences", branch: "Humanities Core" },
        { code: "HS7.101", name: "Human Sciences Lab-1", branch: "CHD Core" },
        { code: "HS0.301", name: "Classical Text Readings - I", branch: "CHD Core" },
        { code: "HS0.302", name: "Research Methods in Human Sciences", branch: "CHD Core" },
        { code: "CE1.501", name: "Structural Dynamics", branch: "M.Tech (CASE)" },
        { code: "CE4.501", name: "Finite Element Methods", branch: "M.Tech (CASE)" },
        { code: "CE1.502", name: "Structural Engineering Design Studio", branch: "M.Tech (CASE)" },
        { code: "CE0.501", name: "Theory of Elasticity", branch: "M.Tech (CASE)" },
    ]

    console.log(`Start seeding ${courses.length} courses...`)

    for (const course of courses) {
        const upsertedCourse = await prisma.course.upsert({
            where: { code: course.code },
            update: {}, // Don't update if exists, just ensure it's there
            create: {
                code: course.code,
                name: course.name,
                branch: course.branch,
                description: `Notes and resources for ${course.name} (${course.code})`
            },
        })
        console.log(`Upserted course: ${upsertedCourse.code}`)
    }

    console.log('Seeding finished.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
