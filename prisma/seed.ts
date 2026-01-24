import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const courses = [
        { code: "CS0.101", name: "Computer Programming", branch: "CSE Core" },
        { code: "CS1.201", name: "Data Structures", branch: "CSE Core" },
        { code: "CS6.201", name: "Introduction to Software Systems", branch: "CSE Core" },
        { code: "CS2.201", name: "Computer Systems Organization", branch: "CSE Core" },
        { code: "CS1.301", name: "Algorithm Analysis & Design", branch: "CSE Core" },
        { code: "CS1.302", name: "Automata Theory", branch: "CSE Core" },
        { code: "CS3.301", name: "Operating Systems", branch: "CSE Core" },
        { code: "CS4.301", name: "Data and Applications", branch: "CSE Core" },
        { code: "CS6.301", name: "Design and Analysis of Software Systems", branch: "CSE Core" },
        { code: "CS7.301", name: "Machine, Data and Learning", branch: "CSE Core" },
        { code: "EC2.101", name: "Digital Systems", branch: "ECE Core" },
        { code: "EC5.101", name: "Networks, Signals and Systems", branch: "ECE Core" },
        { code: "EC2.102", name: "Electronic Workshop-1", branch: "ECE Core" },
        { code: "EC2.103", name: "Analog Electronic Circuits", branch: "ECE Core" },
        { code: "MA5.101", name: "Discrete Structures", branch: "Maths Core" },
        { code: "MA4.101", name: "Real Analysis", branch: "Maths Core" },
        { code: "SC4.101", name: "Computing in Sciences-1", branch: "CND Core" },
        { code: "SC4.102", name: "Computing in Sciences-2", branch: "CND Core" },
        { code: "CL1.101", name: "Introduction to Linguistics-1", branch: "CLD Core" },
        { code: "HS8.101", name: "Making of the Contemporary World", branch: "Humanities Core" },
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
