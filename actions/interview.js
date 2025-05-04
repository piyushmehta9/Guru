"use server";
 
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
 
// Initialize the Google Generative AI client with the provided API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
 
// Temporary in-memory storage for quiz questions (this will reset when the server restarts)
let quizQuestions = [];
 
// Function to generate a chunk of quiz questions (e.g., 4 questions at a time)
async function generateQuestionsChunk(user, startIndex = 0, chunkSize = 4) {
  const prompt = `
    Generate ${chunkSize} technical interview questions for a ${
    user.industry
  } professional${
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
 
  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    const quiz = JSON.parse(cleanedText);
 
    // Add the newly generated questions to the in-memory array
    quizQuestions = [...quizQuestions, ...quiz.questions];
 
    return quiz.questions;
  } catch (error) {
    console.error("Error generating quiz chunk:", error);
    throw new Error("Failed to generate quiz chunk");
  }
}
 
// Function to fetch the next chunk of quiz questions
export async function fetchQuizChunk() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
 
  // Fetch user details
  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      industry: true,
      skills: true,
    },
  });
 
  if (!user) throw new Error("User not found");
 
  // The chunk size is 4 questions per request (you can adjust this value)
  const chunkSize = 4;
 
  // Generate questions in chunks (starting from the last question index)
  await generateQuestionsChunk(user, quizQuestions.length, chunkSize);
 
  // Serve the next chunk of questions
  const chunk = quizQuestions.slice(quizQuestions.length - chunkSize);
 
  return chunk;
}
 
// Optionally, function to clear the quiz questions array (for resetting)
export async function clearQuizQuestions() {
  quizQuestions = [];
}
 
// Function to save quiz results
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
 
  // Get wrong answers
  const wrongAnswers = questionResults.filter((q) => !q.isCorrect);
 
  // Only generate improvement tips if there are wrong answers
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
      console.log(improvementTip);
    } catch (error) {
      console.error("Error generating improvement tip:", error);
      // Continue without improvement tip if generation fails
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
 
// Function to fetch previous assessments
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
