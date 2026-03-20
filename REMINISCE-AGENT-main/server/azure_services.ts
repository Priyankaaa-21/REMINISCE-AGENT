import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import * as fs from "fs";
import * as path from "path";

// Azure Computer Vision (Service 1 of 2)
const visionEndpoint = (process.env.AZURE_COMPUTER_VISION_ENDPOINT || process.env.AZURE_VISION_ENDPOINT)?.replace(/\/$/, '');
const visionKey = process.env.AZURE_COMPUTER_VISION_KEY || process.env.AZURE_VISION_KEY;

// Google Gemini AI
let genAI: GoogleGenerativeAI | null = null;

if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

// Azure Speech Service (Service 2 of 2)
const speechKey = process.env.AZURE_SPEECH_KEY;
const speechRegion = process.env.AZURE_SPEECH_REGION;

export async function analyzeImageWithVision(imageUrl: string): Promise<{ caption: string; tags: string[] }> {
  if (!visionEndpoint || !visionKey) {
    return { caption: "A beautiful memory to cherish.", tags: [] };
  }

  try {
    const response = await axios.post(
      `${visionEndpoint}/computervision/imageanalysis:analyze?api-version=2024-02-01&features=caption,tags,description`,
      { url: imageUrl },
      {
        headers: {
          "Ocp-Apim-Subscription-Key": visionKey,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );
    
    const caption = response.data.captionResult?.text || "A special moment captured in time.";
    const tags = response.data.tagsResult?.values?.slice(0, 10).map((t: any) => t.name) || [];
    
    return { caption, tags };
  } catch (error) {
    console.error("Azure Vision Error:", error);
    return { caption: "A special moment captured in time.", tags: [] };
  }
}

export async function generateMemoryQuestions(
  imageAnalysis: { caption: string; tags: string[] }, 
  userDescription: string,
  previousQuestionsAndAnswers?: { question: string; answer: string }[]
): Promise<string[]> {
  if (!genAI) {
    return [
      "Who is in this photo?",
      "When was this taken?",
      "What were you doing here?",
      "How did you feel in this moment?",
      "What do you remember most about this day?",
      "What sounds or smells do you associate with this memory?",
      "Who took this photo?",
      "What happened right before this moment?"
    ];
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    let previousContext = "";
    if (previousQuestionsAndAnswers && previousQuestionsAndAnswers.length > 0) {
      previousContext = "\n\nPrevious Questions and Patient's Answers:\n" + 
        previousQuestionsAndAnswers.map(qa => `Q: ${qa.question}\nA: ${qa.answer}`).join("\n\n");
    }
    
    const prompt = `You are a compassionate dementia care assistant specializing in reminiscence therapy. Your role is to help elderly patients with memory challenges recall precious moments from their lives.

Photo Analysis:
- Visual Description: ${imageAnalysis.caption}
- Detected Elements: ${imageAnalysis.tags.join(", ")}
- Caretaker's Context: ${userDescription}${previousContext}

Generate exactly 7-8 personalized memory-sparking questions that:
1. Use simple, clear language (max 15 words each)
2. Focus on emotions, people, relationships, and sensory details
3. Are specific to this photo and context, not generic
4. Help trigger deep episodic memories
5. Are warm, encouraging, and non-judgmental in tone
6. Build upon previous answers if available to ask more thoughtful follow-ups
7. Progress from simple recall to deeper emotional memories

Format: Return only the questions, numbered 1-8, one per line.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const questions = text
      .split("\n")
      .filter(q => q.trim().length > 0)
      .map(q => q.replace(/^[0-9]+[\.\)]\s*/, "").trim())
      .filter(q => q.length > 10)
      .slice(0, 8);
    
    if (questions.length >= 5) {
      return questions;
    }
    
    // Fallback questions
    return [
      "Who is with you in this photo?",
      "Where was this special moment?",
      "What were you celebrating or doing?",
      "How did this make you feel?",
      "What do you remember most about this day?",
      "What sounds or smells do you remember?",
      "Who took this photo and why?",
      "What happened right before or after this?"
    ];
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return [
      "Who is with you in this photo?",
      "Where was this moment?",
      "What were you celebrating?",
      "How did this make you feel?",
      "What else do you remember about this day?"
    ];
  }
}

export async function textToSpeech(text: string): Promise<{ audioUrl: string; filename: string }> {
  if (!speechKey || !speechRegion) {
    throw new Error("Azure Speech service not configured");
  }

  try {
    const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
    
    // Configure for high-quality, warm voice suitable for elderly patients
    speechConfig.speechSynthesisVoiceName = "en-US-JennyNeural"; // Warm, friendly female voice
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
    
    const filename = `speech-${Date.now()}.mp3`;
    const audioDir = path.join(process.cwd(), "public", "audio");
    
    // Ensure audio directory exists
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }
    
    const filepath = path.join(audioDir, filename);
    const audioConfig = sdk.AudioConfig.fromAudioFileOutput(filepath);
    
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
    
    return new Promise((resolve, reject) => {
      synthesizer.speakTextAsync(
        text,
        (result) => {
          synthesizer.close();
          
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            resolve({
              audioUrl: `/audio/${filename}`,
              filename: filename
            });
          } else {
            reject(new Error(`Speech synthesis failed: ${result.errorDetails}`));
          }
        },
        (error) => {
          synthesizer.close();
          reject(error);
        }
      );
    });
  } catch (error) {
    console.error("Azure Speech Error:", error);
    throw error;
  }
}
