import React from "react";
import CourseDetailsContainer from "../../../components/CourseDetailsContainer/CourseDetailsContainer";
import CourseMCQContainer from "@/app/admin/components/CourseMCQContainer/CourseMCQContainer";

interface Props {
    params: Promise<{
        courseId: string;
    }>;
}

export default async function CourseDetailsPage({ params }: Props) {
    const { courseId } = await params;
    return (
        <React.Fragment>
            <CourseDetailsContainer courseId={courseId} />
            <CourseMCQContainer courseId={courseId} />
        </React.Fragment>
    );
}