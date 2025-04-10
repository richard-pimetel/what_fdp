const numeroUser = "11987876567";
const BASE_URL = 'https://api-api-8mgw.onrender.com/v1/whatsapp';
let allContacts = [];

// Helper function para criar elementos
function createElement(tag, attributes = {}, ...children) {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'class') {
            element.className = value;
        } else if (key.startsWith('on') && typeof value === 'function') {
            element.addEventListener(key.substring(2).toLowerCase(), value);
        } else if (key === 'textContent') {
            element.textContent = value;
        } else {
            element.setAttribute(key, value);
        }
    });
    
    children.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
            element.appendChild(child);
        } else if (Array.isArray(child)) {
            child.forEach(nestedChild => element.appendChild(nestedChild));
        }
    });
    
    return element;
}

// Componente de Mensagem
function createMessageElement({ content, time, sender }) {
    const messageClass = sender === 'me' ? 'mensagem meMensagem' : 'mensagem contatoMensagem';
    
    return createElement('div', { class: 'linhaMensagem' },
        createElement('div', { class: messageClass },
            createElement('p', { textContent: content }),
            createElement('span', { textContent: time })
        )
    );
}

// Componente de Contato
function createContactElement(contact) {
    return createElement('div', { 
        class: 'contato',
        onclick: async () => {
            await openConversation(contact.name);
        }
    },
        createElement('div', { class: 'perfil' },
            createElement('img', { 
                src: contact.photo || 'https://i.pinimg.com/136x136/21/9e/ae/219eaea67aafa864db091919ce3f5d82.jpg',
                alt: contact.name
            }),
            createElement('div', { class: contact.online ? 'status online' : 'status offline' })
        ),
        createElement('div', { class: 'perfilDados' },
            createElement('h3', {}, 
                contact.name,
                createElement('span', { textContent: contact.lastSeen || 'Ontem' })
            ),
            createElement('p', { textContent: contact.description || 'Nenhuma mensagem recente' })
        )
    );
}

// Função para filtrar contatos
function filterContacts(searchTerm) {
    const normalizedSearch = searchTerm.toLowerCase();
    const filtered = allContacts.filter(contact => 
        contact.name.toLowerCase().includes(normalizedSearch)
    );
    
    renderContactsList(filtered);
}

// Função para renderizar a lista de contatos
function renderContactsList(contacts) {
    const contactsList = document.getElementById("contatos");
    
    // Limpar lista
    contactsList.innerHTML = '';
    
    if (contacts.length === 0) {
        contactsList.appendChild(
            createElement('div', { class: 'empty' }, 'Nenhum contato encontrado')
        );
        return;
    }
    
    const fragment = document.createDocumentFragment();
    contacts.forEach(contact => {
        fragment.appendChild(createContactElement(contact));
    });
    contactsList.appendChild(fragment);
}

// Componente de Área de Conversa
function createConversationArea(name) {
    const right = document.getElementById("right");
    right.innerHTML = '';
    
    // Top bar
    const topBar = createElement('div', { class: 'top' },
        createElement('div', { class: 'contato' },
            createElement('img', { 
                src: 'https://i.pinimg.com/136x136/21/9e/ae/219eaea67aafa864db091919ce3f5d82.jpg',
                alt: name
            }),
            createElement('h2', { textContent: name })
        ),
        createElement('div', { class: 'confg' },
            createElement('button', { type: 'button' },
                createElement('ion-icon', { name: 'search' })
            ),
            createElement('button', { type: 'button' },
                createElement('ion-icon', { name: 'ellipsis-vertical' })
            )
        )
    );
    
    // Conversation area
    const conversationArea = createElement('div', { id: 'conversa' });
    
    // Input area
    const inputField = createElement('input', { 
        type: 'text',
        placeholder: 'Escreva sua mensagem',
        id: 'messageInput'
    });
    
    const sendButton = createElement('button', { 
        type: 'button',
        onclick: async () => {
            const inputValue = inputField.value.trim();
            if (inputValue) {
                try {
                    await fetch(`${BASE_URL}/filter/?nu=${numeroUser}&na=${encodeURIComponent(name)}&wo=${encodeURIComponent(inputValue)}`);
                    await renderConversation(name);
                    inputField.value = '';
                    inputField.focus();
                } catch (error) {
                    console.error('Erro ao enviar mensagem:', error);
                    showError('Erro ao enviar mensagem');
                }
            }
        }
    },
        createElement('ion-icon', { name: 'send' })
    );
    
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendButton.click();
    });
    
    const inputArea = createElement('div', { id: 'envio' },
        createElement('div', {},
            inputField
        ),
        sendButton
    );
    
    // Montar estrutura
    right.append(
        topBar,
        conversationArea,
        inputArea
    );
    
    return right;
}

// Função para renderizar conversa
async function renderConversation(name) {
    const conversation = document.getElementById("conversa");
    if (!conversation) return;
    
    conversation.innerHTML = '';
    conversation.appendChild(createElement('div', { class: 'loading' }, 'Carregando mensagens...'));
    
    try {
        const response = await fetch(`${BASE_URL}/filter/?nu=${numeroUser}&na=${encodeURIComponent(name)}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        
        conversation.innerHTML = '';
        
        if (Array.isArray(data?.messages)) {
            const fragment = document.createDocumentFragment();
            data.messages.forEach(msg => {
                fragment.appendChild(createMessageElement(msg));
            });
            conversation.appendChild(fragment);
            conversation.scrollTop = conversation.scrollHeight;
        } else {
            throw new Error('Formato de mensagens inválido');
        }
    } catch (error) {
        console.error('Erro ao carregar conversa:', error);
        conversation.innerHTML = '';
        conversation.appendChild(
            createElement('div', { class: 'error' }, 'Erro ao carregar mensagens')
        );
    }
}

// Função para abrir conversa
async function openConversation(name) {
    createConversationArea(name);
    await renderConversation(name);
    
    if (window.innerWidth <= 768) {
        document.getElementById("left").classList.remove("active");
    }
}

// Função para renderizar contatos
async function renderContacts() {
    const contactsList = document.getElementById("contatos");
    contactsList.innerHTML = '';
    contactsList.appendChild(createElement('div', { class: 'loading' }, 'Carregando contatos...'));
    
    try {
        const response = await fetch(`${BASE_URL}/data/contact/user/?nu=${numeroUser}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        
        contactsList.innerHTML = '';
        
        if (data?.contacts && Array.isArray(data.contacts)) {
            allContacts = data.contacts;
            renderContactsList(allContacts);
        } else {
            throw new Error('Formato de contatos inválido');
        }
    } catch (error) {
        console.error('Erro ao carregar contatos:', error);
        contactsList.innerHTML = '';
        contactsList.appendChild(
            createElement('div', { class: 'error' }, 'Não foi possível carregar os contatos')
        );
    }
}

// Mostrar erro
function showError(message) {
    const errorElement = createElement('div', {
        class: 'error-notification',
        textContent: message
    });
    
    document.body.appendChild(errorElement);
    
    setTimeout(() => {
        document.body.removeChild(errorElement);
    }, 3000);
}

// Toggle do chat em mobile
function toggleChat() {
    document.getElementById("left").classList.toggle("active");
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Configurar botões
    document.getElementById("chat")?.addEventListener('click', toggleChat);
    document.getElementById("toggleChat")?.addEventListener('click', toggleChat);
    
    // Configurar pesquisa
    document.getElementById("searchInput")?.addEventListener('input', (e) => {
        filterContacts(e.target.value);
    });
    
    // Carregar contatos
    renderContacts();
    
    // Ajustar layout em resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            document.getElementById("left").classList.remove("active");
        }
    });
});