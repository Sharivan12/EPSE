import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

const SYSTEM_INSTRUCTION = `
Você é o "Assistente First-Aid Elétrico" da empresa EPSE. Seu objetivo é prestar suporte técnico de primeiro nível para clientes que possuem nobreaks alugados. Sua prioridade absoluta é a segurança do usuário e a preservação do equipamento.

### DIRETRIZES DE COMPORTAMENTO:
1. SEGURANÇA EM PRIMEIRO LUGAR: Se o usuário relatar cheiro de queimado, fumaça, faíscas ou ruídos de explosão, instrua-o IMEDIATAMENTE a manter distância do equipamento e acionar o suporte de emergência da EPSE. Nunca sugira que o cliente abra o equipamento. Sua resposta para este caso deve ser clara, direta e focada em segurança.
2. LINGUAGEM ACESSÍVEL: Traduza termos técnicos. Em vez de "Subtensão na entrada", use "A energia que vem da rua está muito baixa".
3. DIAGNÓSTICO GUIADO: Não dê todas as soluções de uma vez. Faça perguntas por etapas (ex: "O que aparece no visor?", "Qual a cor da luz que está piscando?").
4. FOCO EM NOBREAKS: Seu conhecimento principal baseia-se em manuais de nobreaks (especialmente as marcas trabalhadas pela EPSE como SMS, NHS, Schneider e Vertiv).

### PROCEDIMENTO DE DIAGNÓSTICO:
- Passo 1: Identificar o estado atual (O nobreak está ligado? Tem energia na tomada? Há alertas sonoros?).
- Passo 2: Interpretar sinais (Relacionar bipes e cores de LEDs com possíveis falhas).
- Passo 3: Sugerir ações simples e seguras (Verificar disjuntor de entrada, reduzir carga conectada, realizar reset a frio se seguro).
- Passo 4: Encaminhamento (Se o problema persistir, forneça o telefone de suporte da EPSE: (11) 2602-2500 ou o telefone de plantão para emergências: (11) 2602-2500, opção 3. Peça para o cliente anotar o código de erro gerado, se houver).

### RESTRIÇÕES:
- Nunca invente códigos de erro. Se não souber, peça para o usuário descrever o que vê.
- Nunca recomende reparos internos pelo cliente.
- Mantenha um tom profissional, calmo e prestativo.

### CONTEXTO DA EPSE:
- A EPSE (Empresa Paulista de Soluções em Energia) preza pela continuidade da operação dos clientes.
- Caso o diagnóstico indique bateria descarregada, explique que o nobreak precisa de algumas horas para recarregar após a volta da energia.

### FORMATO DA RESPOSTA:
Sempre retorne sua resposta como um objeto JSON. O objeto deve ter a chave "message" (uma string com seu texto para o usuário) e "options" (um array de strings para os botões de resposta). Se não houver mais opções para o usuário, retorne um array vazio para "options". Se for uma emergência de segurança, a mensagem deve ser enfática e a lista de opções deve estar vazia.
Exemplo de resposta normal: {"message": "Entendido. O apito é contínuo ou com pausas?", "options": ["Contínuo", "Com pausas"]}
Exemplo de resposta de emergência: {"message": "ATENÇÃO: SEGURANÇA EM PRIMEIRO LUGAR! Afaste-se imediatamente do equipamento...", "options": []}
`;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isDanger?: boolean;
}

interface AssistantResponse {
  message: string;
  options: string[];
}

const EpseLogo = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 180 50"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid meet"
  >
    <text 
      x="50%" 
      y="50%" 
      dy=".3em"
      textAnchor="middle" 
      fontFamily="Inter, sans-serif" 
      fontSize="48" 
      fontWeight="700" 
      fill="#E0E0E0"
    >
      EPSE
    </text>
  </svg>
);


const Modal = ({ onClose }) => (
    <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
                <h2>Sobre Nós</h2>
                <button onClick={onClose} className="modal-close-button">&times;</button>
            </div>
            <div className="modal-body">
                <p>Na EPSE, nosso objetivo é transformar sua visão em energia de forma eficiente, segura e inovadora, garantindo a continuidade da sua operação.</p>
                
                <h3>Contato</h3>
                <ul>
                    <li><strong>Telefone:</strong> <a href="tel:+551126022500">(11) 2602-2500</a></li>
                    <li><strong>Plantão:</strong> <a href="tel:+551126022500,3">(11) 2602-2500 (Opção 3)</a></li>
                    <li><strong>Website:</strong> <a href="https://www.epse.com.br" target="_blank" rel="noopener noreferrer">www.epse.com.br</a></li>
                    <li><strong>Endereço:</strong> Rua dos Trilhos, 600 - Mooca, São Paulo - SP</li>
                </ul>

                <h3>Serviços e Soluções</h3>
                <ul>
                    <li>Infraestrutura</li>
                    <li>Manutenção Preventiva e Corretiva</li>
                    <li>Projetos Elétricos</li>
                    <li>Laudos Técnicos</li>
                    <li>Outsourcing</li>
                    <li>Contratos de Manutenção</li>
                </ul>

                <h3>Produtos e Equipamentos</h3>
                <ul>
                    <li>UPS (Nobreaks)</li>
                    <li>DataCenter</li>
                    <li>Geradores</li>
                    <li>Baterias (VRLA e Estacionárias)</li>
                    <li>Gerenciamento Remoto</li>
                    <li>ATS/STS</li>
                    <li>Gabinetes Indoor e Outdoor</li>
                    <li>Painéis Elétricos</li>
                </ul>
            </div>
        </div>
    </div>
);

const App = () => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleAssistantResponse = (response: GenerateContentResponse) => {
    const responseText = response.text;
    if (!responseText) {
        console.error("No text found in assistant response", response);
        setMessages(prev => [...prev, { role: 'assistant', content: "Ocorreu um erro ao receber a resposta. Por favor, tente reiniciar a conversa." }]);
        setCurrentOptions([]);
        return;
    }

    const parsedData = parseResponse(responseText);
    if (parsedData) {
        const isSafetyAlert = parsedData.message.includes("SEGURANÇA EM PRIMEIRO LUGAR");
        setMessages(prev => [...prev, { role: 'assistant', content: parsedData.message, isDanger: isSafetyAlert }]);
        setCurrentOptions(parsedData.options);
    } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "Desculpe, não entendi a resposta. Poderia tentar de novo?" }]);
        setCurrentOptions([]);
    }
  };

  const initChat = async () => {
      setIsLoading(true);
      setMessages([]);
      setCurrentOptions([]);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const chatSession = ai.chats.create({
          model: 'gemini-3-flash-preview',
          config: { systemInstruction: SYSTEM_INSTRUCTION },
        });
        setChat(chatSession);

        const response = await chatSession.sendMessage({ message: "Inicie a conversa como o assistente da EPSE. Cumprimente o usuário e pergunte de forma concisa como você pode ajudar com o nobreak dele." });
        handleAssistantResponse(response);

      } catch (error) {
        console.error("Erro ao inicializar o chat:", error);
        setMessages([{ role: 'assistant', content: "Desculpe, não consigo me conectar ao assistente no momento. Por favor, tente novamente mais tarde." }]);
      } finally {
        setIsLoading(false);
      }
    };
  
  useEffect(() => {
    initChat();
  }, []);
  
  const parseResponse = (responseText: string | null | undefined): AssistantResponse | null => {
    if (!responseText) {
        return null;
    }
    try {
        const cleanedText = responseText.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanedText);
        if (parsed.message && Array.isArray(parsed.options)) {
            return parsed;
        }
        return null;
    } catch (error) {
        console.error("Erro ao parsear a resposta do assistente:", error, responseText);
        return { message: responseText, options: [] };
    }
  };

  const handleSend = async (messageText: string) => {
    if (!chat || isLoading) return;

    setIsLoading(true);
    setCurrentOptions([]);
    setMessages(prev => [...prev, { role: 'user', content: messageText }]);

    try {
      const response = await chat.sendMessage({ message: messageText });
      handleAssistantResponse(response);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Ocorreu um erro. Por favor, tente novamente." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="chat-container">
        <header className="chat-header">
          <EpseLogo className="header-logo" />
          <h1>Guia EPSE de Emergência</h1>
        </header>
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.role} ${msg.isDanger ? 'danger' : ''} ${index === 0 && msg.role === 'assistant' ? 'welcome-message' : ''}`}>
              <div className="message-content" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br />') }} />
            </div>
          ))}
          {isLoading && messages.length > 0 && (
            <div className="message assistant">
              <div className="loading-indicator">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-input-area">
          {!isLoading && currentOptions.length > 0 && (
            <div className="options-container">
              {currentOptions.map((option, index) => (
                <button key={index} className="option-button" onClick={() => handleSend(option)} disabled={isLoading}>
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <nav className="bottom-nav">
          <button className="nav-button" onClick={initChat} aria-label="Início">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
              <span>Início</span>
          </button>
          <button className="nav-button" onClick={() => setIsModalOpen(true)} aria-label="Sobre Nós">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
              <span>Sobre Nós</span>
          </button>
      </nav>
      {isModalOpen && <Modal onClose={() => setIsModalOpen(false)} />}
    </>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
