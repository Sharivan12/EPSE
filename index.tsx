import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isDanger?: boolean;
}

const conversationTree = {
  start: {
    message: 'Olá! Sou o "Assistente First-Aid Elétrico" da EPSE. Por favor, selecione o problema com seu nobreak.',
    options: [
      { text: 'Está apitando', nextStep: 'beep_type' },
      { text: 'Não liga', nextStep: 'wont_turn_on_check_plug' },
      { text: 'Cheiro de queimado ou fumaça', nextStep: 'safety_alert' },
    ],
  },
  safety_alert: {
    message: '<strong>ATENÇÃO: SEGURANÇA EM PRIMEIRO LUGAR!</strong><br/><br/>Afaste-se imediatamente do equipamento. Não toque no nobreak ou nos cabos.<br/><br/>Se for seguro, desligue o disjuntor de energia do cômodo. Entre em contato com nosso plantão de emergência <strong>IMEDIATAMENTE</strong>.<br/><br/><a href="tel:+551126022500,3">(11) 2602-2500 (Opção 3)</a>',
    isDanger: true,
    options: [{ text: 'Reiniciar conversa', nextStep: 'start' }],
  },
  beep_type: {
    message: 'Entendido. O apito é contínuo ou tem pausas (intermitente)?',
    options: [
      { text: 'Contínuo', nextStep: 'continuous_beep_cause' },
      { text: 'Com pausas', nextStep: 'intermittent_beep_cause' },
    ],
  },
  continuous_beep_cause: {
    message: 'Um apito contínuo geralmente indica <strong>sobrecarga</strong>. Há muitos equipamentos ligados ao nobreak?',
    options: [
      { text: 'Sim, vários equipamentos', nextStep: 'overload_solution' },
      { text: 'Não, poucos equipamentos', nextStep: 'not_overload' },
    ],
  },
  overload_solution: {
    message: 'Por favor, desconecte alguns aparelhos menos importantes da saída do nobreak e observe se o apito para.',
    options: [
      { text: 'O apito parou', nextStep: 'success_end' },
      { text: 'O apito continua', nextStep: 'contact_support' },
    ],
  },
  not_overload: {
    message: 'Ok. Se não é sobrecarga, pode ser uma falha interna. Neste caso, o ideal é acionar nosso suporte técnico para uma análise segura.',
    options: [{ text: 'Entrar em contato com suporte', nextStep: 'contact_support' }],
  },
  intermittent_beep_cause: {
    message: 'Apitos com pausas normalmente indicam que o nobreak está <strong>usando a bateria</strong>. Faltou energia na sua região?',
    options: [
      { text: 'Sim, a energia caiu', nextStep: 'power_outage_info' },
      { text: 'Não, a energia está normal', nextStep: 'normal_power_battery_check' },
    ],
  },
  power_outage_info: {
    message: 'Certo. O nobreak está funcionando como esperado. Recomendo que salve seus trabalhos e desligue os equipamentos para economizar a carga da bateria até a energia retornar.',
    options: [
        { text: 'Entendido, obrigado!', nextStep: 'end_conversation' },
        { text: 'Reiniciar conversa', nextStep: 'start' }
    ],
  },
  normal_power_battery_check: {
    message: 'Se a energia está normal, o problema pode ser na qualidade da energia da rua ou uma falha na bateria. É uma situação que requer análise técnica para não danificar seus equipamentos.',
    options: [{ text: 'Entrar em contato com suporte', nextStep: 'contact_support' }],
  },
  wont_turn_on_check_plug: {
    message: 'Vamos ao básico. O nobreak está conectado firmemente na tomada e a tomada tem energia? Você pode testar a tomada com outro aparelho, como um carregador de celular.',
    options: [
      { text: 'Sim, a tomada funciona', nextStep: 'power_in_outlet_check_breaker' },
      { text: 'Não, a tomada está sem energia', nextStep: 'no_power_in_outlet' },
    ],
  },
  no_power_in_outlet: {
    message: 'O problema parece ser a tomada. Por favor, verifique o disjuntor correspondente no seu quadro de energia. Se não resolver, você precisará de um eletricista.',
    options: [
        { text: 'Ok, vou verificar', nextStep: 'end_conversation' },
        { text: 'Reiniciar conversa', nextStep: 'start' }
    ],
  },
  power_in_outlet_check_breaker: {
    message: 'Ok. Verifique na parte de trás do nobreak se há um pequeno botão (geralmente preto ou vermelho) chamado "circuit breaker". Ele está saltado para fora?',
    options: [
      { text: 'Sim, estava saltado', nextStep: 'reset_breaker' },
      { text: 'Não, parece normal', nextStep: 'contact_support' },
    ],
  },
  reset_breaker: {
    message: 'Pressione esse botão para rearmá-lo e tente ligar o nobreak novamente. Isso resolveu?',
    options: [
      { text: 'Sim, agora ligou!', nextStep: 'success_end' },
      { text: 'Não, continua sem ligar', nextStep: 'contact_support' },
    ],
  },
  contact_support: {
    message: 'Entendido. Para garantir sua segurança e a do equipamento, o melhor a fazer é acionar nosso suporte técnico. Anote qualquer informação que veja no visor, se houver.<br/><br/>Ligue para: <a href="tel:+551126022500">(11) 2602-2500</a>',
    options: [
        { text: 'Obrigado!', nextStep: 'end_conversation' },
        { text: 'Reiniciar conversa', nextStep: 'start' }
    ],
  },
  success_end: {
    message: 'Excelente! Fico feliz em ter ajudado. Se o problema retornar, não hesite em nos contatar.',
    options: [{ text: 'Reiniciar conversa', nextStep: 'start' }],
  },
  end_conversation: {
    message: 'Obrigado por utilizar nosso assistente. Estamos à disposição!',
    options: [{ text: 'Reiniciar conversa', nextStep: 'start' }],
  }
};


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
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentOptions, setCurrentOptions] = useState<{text: string; nextStep: string}[]>([]);
  const [currentStepId, setCurrentStepId] = useState('start');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);
  
  const initChat = () => {
    setMessages([]);
    setCurrentStepId('start');
  };
  
  useEffect(() => {
    const currentStep = conversationTree[currentStepId];
    if (currentStep) {
        // Add a small delay to simulate the assistant "typing"
        const timer = setTimeout(() => {
            setMessages(prev => [...prev, { role: 'assistant', content: currentStep.message, isDanger: !!currentStep.isDanger }]);
            setCurrentOptions(currentStep.options || []);
        }, 250);
        
        return () => clearTimeout(timer);
    }
  }, [currentStepId]);

  useEffect(() => {
    initChat();
  }, []);

  const handleSend = (option: { text: string; nextStep: string }) => {
    setMessages(prev => [...prev, { role: 'user', content: option.text }]);
    setCurrentOptions([]);
    setCurrentStepId(option.nextStep);
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
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-input-area">
          {currentOptions.length > 0 && (
            <div className="options-container">
              {currentOptions.map((option, index) => (
                <button key={index} className="option-button" onClick={() => handleSend(option)}>
                  {option.text}
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
