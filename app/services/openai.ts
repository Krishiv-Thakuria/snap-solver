import OpenAI from 'openai';
import { EXPO_PUBLIC_OPENAI_API_KEY } from '@env';

const apiKey = EXPO_PUBLIC_OPENAI_API_KEY;

console.log('API Key first 10 chars:', apiKey?.substring(0, 10));

if (!apiKey) {
  throw new Error('OpenAI API key is not set in environment variables');
}

const openai = new OpenAI({
  apiKey,
  dangerouslyAllowBrowser: true
});

interface Step {
  equation: string;
  description: string;
}

export interface SolutionResponse {
  expression: string;
  answer: string;
  steps: Step[];
}

export async function analyzeImage(imageBase64: string): Promise<string> {
  try {
    console.log('Starting image analysis...');
    if (!imageBase64 || imageBase64.length < 1000) {
      throw new Error('Invalid image data received');
    }
    console.log('Image data length:', imageBase64.length);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a mathematical problem interpreter. Your task is to analyze images of math problems and convert them into solvable expressions. Follow these guidelines:

1. For written equations:
   - Preserve the exact format and symbols
   - Maintain operator precedence
   - Keep variables as shown (e.g., 'x', 'y', 'n')

2. For geometric diagrams:
   - Identify the shape and given measurements
   - Note any marked angles, sides, or special properties
   - Create an equation using appropriate theorems
   Example: For a right triangle with sides 3 and 4, return "Find c where a = 3, b = 4 in right triangle"

3. For word problems:
   - Extract the key numerical values
   - Identify the unknown variable
   - Formulate an appropriate equation
   Example: "A train travels 120km in 2 hours" → "120 = 2v, solve for v"

4. For graphs/charts:
   - Note coordinates of key points
   - Identify any functions or relationships
   - Express as an equation if needed

Return ONLY the mathematical expression or question, without explanations.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this math problem. If it's a diagram or word problem, formulate the appropriate equation. Return only the core mathematical question or expression."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      temperature: 0,
      max_tokens: 100  // Limit response length to ensure we get just the equation
    });

    console.log('Full API Response:', JSON.stringify(response, null, 2));
    const content = response.choices[0]?.message?.content;
    console.log('Raw GPT response:', content);

    if (!content) {
      throw new Error('No response received from GPT');
    }

    return content.trim();
  } catch (error) {
    console.error('Error in analyzeImage:', error);
    if (error instanceof Error) {
      throw new Error(`Image analysis failed: ${error.message}`);
    }
    throw new Error('Image analysis failed with unknown error');
  }
}

export async function solveExpression(expression: string): Promise<SolutionResponse> {
  try {
    console.log('Solving expression:', expression);
    if (!expression || expression.toLowerCase().includes("sorry") || expression.toLowerCase().includes("can't see")) {
      return {
        expression: expression || "No expression provided",
        answer: "Could not identify a math problem",
        steps: [{
          equation: expression || "No expression provided",
          description: "The image analysis could not find a clear math problem to solve"
        }]
      };
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Solve math problems with clear explanations. For each step: 1) Explain why you're using a method, 2) Define key terms, 3) Show calculations clearly. For geometry, explain which theorem applies and why. Use proper notation (x², √, θ)."
        },
        {
          role: "user",
          content: `Solve this step by step, explaining concepts clearly. Format exactly like this:
{
  "expression": "In a right triangle, a = 3, b = 4, find c",
  "answer": "c = 5",
  "steps": [
    {
      "equation": "Right Triangle: a = 3, b = 4, c = ?",
      "description": "This is a right triangle problem because we have a 90° angle. When a triangle has a 90° angle, we can use the Pythagorean theorem to find the missing side."
    },
    {
      "equation": "c² = a² + b²",
      "description": "The Pythagorean theorem states that in a right triangle, the square of the hypotenuse (c) equals the sum of squares of the other two sides (a and b)."
    },
    {
      "equation": "c² = 3² + 4²",
      "description": "We substitute our known values: side a = 3 and side b = 4. The side we're solving for (c) is the hypotenuse."
    },
    {
      "equation": "c² = 9 + 16 = 25",
      "description": "Calculate the squares and add: 3² = 9, 4² = 16, sum = 25"
    },
    {
      "equation": "c = 5",
      "description": "Take the square root of 25 to find the length of the hypotenuse."
    }
  ]
}

Math problem to solve: ${expression}`
        }
      ],
      temperature: 0
    });

    console.log('Full API Response:', JSON.stringify(response, null, 2));
    const content = response.choices[0]?.message?.content;
    console.log('Raw GPT response:', content);

    if (!content) {
      throw new Error('No solution received from GPT');
    }

    try {
      const parsed = JSON.parse(content.trim()) as SolutionResponse;
      console.log('Successfully parsed solution:', parsed);
      return parsed;
    } catch (parseError) {
      console.error('Parse error:', parseError);
      console.error('Failed content:', content);
      
      return {
        expression: expression,
        answer: 'Error: Could not parse solution',
        steps: [{
          equation: expression,
          description: 'Failed to process the solution. Please try again.'
        }]
      };
    }
  } catch (error) {
    console.error('Error in solveExpression:', error);
    return {
      expression: expression,
      answer: 'Error: Could not solve expression',
      steps: [{
        equation: expression,
        description: 'An error occurred while solving the expression'
      }]
    };
  }
} 