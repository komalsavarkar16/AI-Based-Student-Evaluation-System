import { Brain, MapIcon, Video } from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface FeatureItem {
    id: number;
    title: string;
    description: string;
    icon: LucideIcon;
}

export const features: FeatureItem[] = [
    {
        id: 1,
        title: "AI-Generated Questions",
        description:
            "Advanced AI algorithms generate personalized MCQ questions tailored to assess student knowledge and competency levels effectively.",
        icon: Brain,
    },
    {
        id: 2,
        title: "Video-Based Test",
        description:
            "Revolutionary video assessment that analyzes student responses, body language, and communication skills using computer vision and NLP.",
        icon: Video,
    },
    {
        id: 3,
        title: "Bridge Course Recommendations",
        description:
            "Smart AI recommendations suggest personalized bridge courses to help students fill knowledge gaps and succeed in their desired programs.",
        icon: MapIcon,
    },
];
