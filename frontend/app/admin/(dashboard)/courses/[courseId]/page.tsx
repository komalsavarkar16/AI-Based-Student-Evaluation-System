import CourseDetailsContainer from "../../../components/CourseDetailsContainer/CourseDetailsContainer";

interface Props {
    params: Promise<{
        courseId: string;
    }>;
}

export default async function CourseDetailsPage({ params }: Props) {
    const { courseId } = await params;
    return (
        <CourseDetailsContainer courseId={courseId} />
    );
}