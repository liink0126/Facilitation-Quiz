import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Generates an image based on a text prompt using the Gemini API.
 * @param prompt The text prompt for image generation.
 * @returns A promise that resolves to a base64 encoded image data URL.
 */
export async function generateImage(prompt: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        return `data:image/png;base64,${base64ImageBytes}`;
      }
    }
    throw new Error("응답에서 이미지 데이터를 찾을 수 없습니다.");
  } catch (error) {
    console.error("이미지 생성 오류:", error);
    if (error instanceof Error && error.message.includes('API key not valid')) {
        throw new Error("API 키가 유효하지 않습니다. 설정을 확인해주세요.");
    }
    throw new Error("이미지 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }
}

/**
 * Generates a personalized explanation based on the user's incorrect answer.
 * @param question The quiz question.
 * @param correctAnswer The correct answer.
 * @param incorrectAnswer The answer the user selected incorrectly.
 * @param originalExplanation The original explanation from the quiz.
 * @returns A promise that resolves to a personalized explanation.
 */
export async function generatePersonalizedExplanation(
  question: string,
  correctAnswer: string,
  incorrectAnswer: string,
  originalExplanation: string
): Promise<string> {
  try {
    const prompt = `다음은 퍼실리테이션 학습 퀴즈입니다.

문제: ${question}

정답: ${correctAnswer}
사용자가 선택한 오답: ${incorrectAnswer}

기존 해설: ${originalExplanation}

위 정보를 바탕으로, 사용자가 선택한 오답(${incorrectAnswer})이 왜 틀렸는지, 그리고 정답(${correctAnswer})이 왜 맞는지를 명확하게 설명하는 맞춤형 해설을 작성해주세요. 

다음 형식을 따라주세요:
1. 사용자가 선택한 오답이 왜 틀렸는지 간단히 설명
2. 정답이 왜 맞는지 설명
3. 핵심 포인트를 강조

HTML 태그를 사용하지 말고 순수 텍스트로 작성해주세요. 친절하고 이해하기 쉽게 설명해주세요.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: {
        parts: [{ text: prompt }],
      },
    });

    const explanation = response.candidates?.[0]?.content?.parts?.[0]?.text || originalExplanation;
    return explanation;
  } catch (error) {
    console.error("맞춤형 해설 생성 오류:", error);
    
    // 더 구체적인 에러 메시지 제공
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('API_KEY')) {
        throw new Error("API 키가 설정되지 않았거나 유효하지 않습니다. 환경 변수를 확인해주세요.");
      }
      if (error.message.includes('network') || error.message.includes('fetch')) {
        throw new Error("네트워크 연결을 확인해주세요. 인터넷 연결이 불안정할 수 있습니다.");
      }
      if (error.message.includes('quota') || error.message.includes('limit')) {
        throw new Error("API 사용량 한도를 초과했습니다. 잠시 후 다시 시도해주세요.");
      }
    }
    
    // API 오류 시 기존 해설 반환
    return originalExplanation;
  }
}
