export interface Step {
    id: number;
    title: string;
    description: string;
}

export const steps: Step[] = [
    {
        id: 1,
        title: "Student Registration",
        description: "Students create an account and select their desired course. The system prepares personalized assessment tests based on course requirements."
    },
    {
        id: 2,
        title: "MCQ Assessment",
        description: "AI generates customized multiple-choice questions to evaluate theoretical knowledge and conceptual understanding of the subject matter."
    },
    {
        id: 3,
        title: "Video-Based Test",
        description: "Students record video responses to AI-generated questions. Advanced algorithms analyze verbal communication, confidence, and subject comprehension."
    },
    {
        id: 4,
        title: "AI Analysis & Results",
        description: "AI processes both test results, generates comprehensive evaluation reports, and determines student eligibility for the course."
    },
    {
        id: 5,
        title: "Admin Review & Enrollment",
        description: "Administrators review AI-generated reports and make final enrollment decisions. Eligible students are enrolled immediately into their courses."
    },
    {
        id: 6,
        title: "Bridge Course Recommendation",
        description: "If students don't meet requirements, AI recommends personalized bridge courses to strengthen weak areas and prepare for future enrollment."
    },
];
