'use strict';

document.addEventListener('DOMContentLoaded', function() {
    // Configurações
    const CONFIG = {
        API_URL: 'http://localhost:8080',
        USER_NUMBER: '11987876567',
        COLORS: ['#FF5733', '#33FF57', '#3357FF', '#F333FF', '#33FFF5', '#FF33A8', '#FFC733']
    };

    // Elementos do DOM
    const elements = {
        chatsList: document.querySelector('#chats-list'),
        searchInput: document.querySelector('#search-input'),
        messageInput: document.querySelector('#message-input'),
        messagesContainer: document.querySelector('#messages-container'),
        welcomeScreen: document.querySelector('#welcome-screen'),
        chatScreen: document.querySelector('#chat-screen'),
        chatContactName: document.querySelector('#chat-contact-name'),
        chatContactAvatar: document.querySelector('#chat-contact-avatar'),
        chatContactStatus: document.querySelector('#chat-contact-status'),
        userAvatar: document.querySelector('.user-profile .avatar')
    };

    // Estado da aplicação
    const state = {
        user: null,
        contacts: [],
        currentChat: null,
        messages: []
    };

    // Função para criar avatar com inicial
    function createAvatarElement(name, size = 49) {
        const initial = name.charAt(0).toUpperCase();
        const colorIndex = initial.charCodeAt(0) % CONFIG.COLORS.length;
        const color = CONFIG.COLORS[colorIndex];
        
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.style.width = `${size}px`;
        avatar.style.height = `${size}px`;
        avatar.style.borderRadius = '50%';
        avatar.style.backgroundColor = color;
        avatar.style.display = 'flex';
        avatar.style.alignItems = 'center';
        avatar.style.justifyContent = 'center';
        avatar.style.color = 'white';
        avatar.style.fontWeight = 'bold';
        avatar.style.fontSize = `${size * 0.5}px`;
        avatar.textContent = initial;
        
        return avatar;
    }

    // Funções para consumir a API
    async function fetchAPI(endpoint, params = {}) {
        const url = new URL(`${CONFIG.API_URL}${endpoint}`);
        url.searchParams.set('nu', CONFIG.USER_NUMBER);
        
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, value);
        });

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Erro na requisição:', error);
            throw error;
        }
    }

    // Carregar dados do usuário
    async function loadUserData() {
        try {
            const [userData, profileData] = await Promise.all([
                fetchAPI('/v1/whatsapp/data/user/unalterable/'),
                fetchAPI('/v1/whatsapp/data/user/editable/')
            ]);
            
            state.user = { 
                ...userData, 
                ...profileData,
                name: userData.name || 'Usuário'
            };
            
            updateUserInterface();
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
            state.user = {
                name: 'Usuário',
                status: 'online'
            };
            updateUserInterface();
        }
    }

    // Atualizar interface do usuário
    function updateUserInterface() {
        if (elements.userAvatar) {
            // Substitui a imagem pelo avatar com inicial
            const avatar = createAvatarElement(state.user.name);
            elements.userAvatar.replaceWith(avatar);
        }
    }

    // Carregar contatos
    async function loadContacts() {
        try {
            const { contacts } = await fetchAPI('/v1/whatsapp/data/contact/user/');
            
            state.contacts = (contacts || []).map(contact => ({
                ...contact,
                name: contact.name || 'Contato'
            }));
            
            renderContacts();
        } catch (error) {
            console.error('Erro ao carregar contatos:', error);
            state.contacts = [];
            renderContacts();
        }
    }

    // Renderizar contatos
    function renderContacts(filteredContacts = null) {
        if (!elements.chatsList) return;
        
        elements.chatsList.innerHTML = '';
        const contactsToRender = filteredContacts || state.contacts;
        
        contactsToRender.forEach(contact => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.dataset.contactName = contact.name;
            
            // Cria avatar com inicial
            const avatar = createAvatarElement(contact.name);
            
            chatItem.innerHTML = `
                <div class="chat-info">
                    <div class="chat-header">
                        <span class="chat-name">${contact.name}</span>
                        <span class="chat-time">12:00</span>
                    </div>
                    <div class="chat-message">${contact.description || 'Sem mensagens'}</div>
                </div>
            `;
            
            // Insere o avatar no início
            chatItem.insertBefore(avatar, chatItem.firstChild);
            
            chatItem.addEventListener('click', () => openChat(contact));
            elements.chatsList.appendChild(chatItem);
        });
    }

    // Abrir chat
    async function openChat(contact) {
        try {
            if (!elements.chatContactAvatar || !elements.chatContactName) return;
            
            state.currentChat = contact;
            elements.welcomeScreen.style.display = 'none';
            elements.chatScreen.classList.remove('hidden');
            
            // Atualiza cabeçalho do chat com avatar de inicial
            elements.chatContactName.textContent = contact.name;
            
            // Substitui a imagem pelo avatar com inicial
            const avatar = createAvatarElement(contact.name);
            elements.chatContactAvatar.replaceWith(avatar);
            elements.chatContactAvatar = avatar; // Atualiza referência
            
            elements.chatContactStatus.textContent = 'online';
            
            // Carrega mensagens
            const { messages } = await fetchAPI('/v1/whatsapp/filter/', { 
                na: contact.name 
            });
            renderMessages(messages || []);
            
        } catch (error) {
            console.error('Erro ao abrir chat:', error);
            if (elements.messagesContainer) {
                elements.messagesContainer.innerHTML = `
                    <div class="error-message">
                        Erro ao carregar conversa. Tente novamente.
                    </div>
                `;
            }
        }
    }

    // Renderizar mensagens
    function renderMessages(messages) {
        if (!elements.messagesContainer) return;
        
        elements.messagesContainer.innerHTML = '';
        
        if (!messages || messages.length === 0) {
            elements.messagesContainer.innerHTML = `
                <div class="empty-message">
                    Nenhuma mensagem encontrada
                </div>
            `;
            return;
        }
        
        messages.forEach(msg => {
            const messageElement = document.createElement('div');
            messageElement.className = `message ${msg.sender === 'me' ? 'outgoing' : 'incoming'}`;
            messageElement.innerHTML = `
                <div class="message-content">${msg.content}</div>
                <div class="message-time">
                    ${msg.time}
                    ${msg.sender === 'me' ? '<span class="message-status">✓✓</span>' : ''}
                </div>
            `;
            elements.messagesContainer.appendChild(messageElement);
        });
        
        scrollToBottom();
    }

    // Função auxiliar para scroll
    function scrollToBottom() {
        if (elements.messagesContainer) {
            elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
        }
    }

    // Event listeners
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const filteredContacts = state.contacts.filter(contact => 
                contact.name.toLowerCase().includes(searchTerm) ||
                (contact.description && contact.description.toLowerCase().includes(searchTerm))
            );
            renderContacts(filteredContacts);
        });
    }

    if (elements.messageInput) {
        elements.messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const messageText = elements.messageInput.value.trim();
                if (!messageText || !state.currentChat) return;
                
                const newMessage = {
                    sender: 'me',
                    content: messageText,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                
                const messageElement = document.createElement('div');
                messageElement.className = 'message outgoing';
                messageElement.innerHTML = `
                    <div class="message-content">${newMessage.content}</div>
                    <div class="message-time">
                        ${newMessage.time}
                        <span class="message-status">✓✓</span>
                    </div>
                `;
                
                if (elements.messagesContainer) {
                    elements.messagesContainer.appendChild(messageElement);
                    elements.messageInput.value = '';
                    scrollToBottom();
                }
            }
        });
    }

    // Inicialização
    async function initializeApp() {
        try {
            await loadUserData();
            await loadContacts();
        } catch (error) {
            console.error('Erro na inicialização:', error);
        }
    }

    initializeApp();
});