// context/AnalysisContext.tsx
import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';

export type SarcasmClass = "sarcasm" | "not_sarcasm";

export interface AnalysisResult {
    text: string;
    cls: SarcasmClass;
    type: string;
    conf: number;
    indicators: string[];
    intent_words: string[];
    emojis: string[];
    punctuations: string[];
    keywords: string[];
}

interface AnalysisContextType {
    results: AnalysisResult[];
    addResult: (result: AnalysisResult) => void;
    clearResults: () => void;
    analyzeText: (text: string) => Promise<AnalysisResult>;
    isLoading: boolean;
    error: string | null;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export const useAnalysis = () => {
    const context = useContext(AnalysisContext);
    if (!context) {
        throw new Error('useAnalysis must be used within AnalysisProvider');
    }
    return context;
};

interface AnalysisProviderProps {
    children: ReactNode;
}

export const AnalysisProvider = ({ children }: AnalysisProviderProps) => {
    const [results, setResults] = useState<AnalysisResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addResult = (result: AnalysisResult) => {
        setResults(prev => [result, ...prev]);
    };

    const clearResults = () => {
        setResults([]);
    };

    const analyzeText = async (text: string): Promise<AnalysisResult> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await axios.post('/api/chatbot/analyze/', { text });
            const data = response.data;

            const result: AnalysisResult = {
                text: data.text || text,
                cls: data.cls as SarcasmClass,
                type: data.type,
                conf: data.conf,
                indicators: data.indicators || [],
                intent_words: data.intent_words || [],
                emojis: data.emojis || [],
                punctuations: data.punctuations || [],
                keywords: data.keywords || [],
            };

            addResult(result);
            return result;
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || err.message || 'حدث خطأ في التحليل';
            setError(errorMsg);
            throw new Error(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnalysisContext.Provider value={{
            results,
            addResult,
            clearResults,
            analyzeText,
            isLoading,
            error,
        }}>
            {children}
        </AnalysisContext.Provider>
    );
};