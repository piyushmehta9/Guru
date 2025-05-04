"use server";
 
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
 
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
 
export async function generateQuiz() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
 
  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      industry: true,
      skills: true,
    },
  });
 
  if (!user) throw new Error("User not found");
 
  const basePrompt = (count: number) => `
    Generate ${count} technical interview questions for a ${user.industry} professional${
    user.skills?.length ? ` with expertise in ${user.skills.join(", ")}` : ""
  }.
 
    Each question should be multiple choice with 4 options.
 
    Return the response in this JSON format only, no additional text:
    {
      "questions": [
        {
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "correctAnswer": "string",
          "explanation": "string"
        }
      ]
    }
  `;
 
  const allQuestions = [];
 
  try {
    // 4 chunks of 5 questions
    for (let i = 0; i < 4; i++) {
      const prompt = basePrompt(5);
      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```(?:json)?\n?/g, "").trim();
      const parsed = JSON.parse(text);
      allQuestions.push(...parsed.questions);
    }
 
    return allQuestions;
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw new Error("Failed to generate quiz questions");
  }
}
 
export async function saveQuizResult(questions, answers, score) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
 
  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });
 
  if (!user) throw new Error("User not found");
 
  const questionResults = questions.map((q, index) => ({
    question: q.question,
    answer: q.correctAnswer,
    userAnswer: answers[index],
    isCorrect: q.correctAnswer === answers[index],
    explanation: q.explanation,
  }));
 
  const wrongAnswers = questionResults.filter((q) => !q.isCorrect);
  let improvementTip = null;
 
  if (wrongAnswers.length > 0) {
    const wrongQuestionsText = wrongAnswers
      .map(
        (q) =>
          `Question: "${q.question}"\nCorrect Answer: "${q.answer}"\nUser Answer: "${q.userAnswer}"`
      )
      .join("\n\n");
 
    const improvementPrompt = `
      The user got the following ${user.industry} technical interview questions wrong:
 
      ${wrongQuestionsText}
 
      Based on these mistakes, provide a concise, specific improvement tip.
      Focus on the knowledge gaps revealed by these wrong answers.
      Keep the response under 2 sentences and make it encouraging.
      Don't explicitly mention the mistakes, instead focus on what to learn/practice.
    `;
 
    try {
      const result = await model.generateContent(improvementPrompt);
      const response = result.response;
      improvementTip = response.text().trim();
    } catch (error) {
      console.error("Error generating improvement tip:", error);
    }
  }
 
  try {
    const assessment = await db.assessment.create({
      data: {
        userId: user.id,
        quizscore: score,
        questions: questionResults,
        category: "Technical",
        improvementTip,
      },
    });
 
    return assessment;
  } catch (error) {
    console.error("Error saving quiz result:", error);
    throw new Error("Failed to save quiz result");
  }
}
 
export async function getAssessments() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
 
  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });
 
  if (!user) throw new Error("User not found");
 
  try {
    const assessments = await db.assessment.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
 
    return assessments;
  } catch (error) {
    console.error("Error fetching assessments:", error);
    throw new Error("Failed to fetch assessments");
  }
}
