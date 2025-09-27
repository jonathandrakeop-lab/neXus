// personagens.js

const container = document.getElementById('personagensContainer');
const btnCriar = document.getElementById('btnCriar');

// Salvar personagens no localStorage
function salvar(personagens){
    localStorage.setItem('portal_personagens', JSON.stringify(personagens));
}

// Carregar personagens do localStorage
function carregar(){
    return JSON.parse(localStorage.getItem('portal_personagens')) || [];
}

let personagens = carregar(); // mantém os já salvos

function renderPersonagem(p, highlight=false){
    const card = document.createElement('div');
    card.className = 'personagem-btn';
    card.dataset.nome = p.nome;
    card.innerHTML = `
        <img src="${p.imagem}" alt="${p.nome}">
        <div class="personagem-info">
            <b>${p.nome}</b>
            <span>Raça: ${p.raca || '-'}</span>
            <span>Tamanho: ${p.tamanho || '-'}</span>
        </div>
    `;

    const del = document.createElement('button');
    del.className = 'delete-btn';
    const delImg = document.createElement('img');
    delImg.src = 'Trashy.png';
    del.appendChild(delImg);
    del.addEventListener('click', e=>{
        e.stopPropagation();
        if(confirm(`Excluir ${p.nome}?`)){
            personagens = personagens.filter(x=>x !== p);
            salvar(personagens);
            card.remove();
        }
    });
    card.appendChild(del);

    card.addEventListener('click', ()=>{
        document.querySelectorAll('.personagem-btn').forEach(el=>el.classList.remove('selected'));
        card.classList.add('selected');
        localStorage.setItem('portal_personagemSelecionado', p.nome);
    });

    card.addEventListener('dblclick', ()=>{
        localStorage.setItem('portal_personagemSelecionado', p.nome);
        window.location.href = p.pagina;
    });

    container.appendChild(card);

    if(highlight){
        card.classList.add('highlight');
        setTimeout(()=>card.classList.remove('highlight'),900);
        card.classList.add('selected');
    }
}

// Renderiza todos os personagens salvos ao carregar a página
function renderAll(){
    container.innerHTML='';
    personagens.forEach(p=>renderPersonagem(p));
}

renderAll();

// ---------------------------
// Botão de criar novo personagem
// ---------------------------
btnCriar.addEventListener('click', ()=>{
    const nome = prompt("Digite o nome do novo personagem:");
    if(!nome) return;

    const raca = prompt("Digite a raça do personagem: (ex: Mariposa, Skaar...)") || "Desconhecida";

    // Select de tamanho
    let tamanho = prompt("Escolha o tamanho do personagem: pequeno, médio ou grande") || "médio";
    tamanho = tamanho.toLowerCase();
    if(!["pequeno","médio","grande"].includes(tamanho)){
        tamanho = "médio";
    }

    const novo = {
        nome: nome,
        raca: raca,
        tamanho: tamanho,
        imagem: 'New.png',
        pagina: `Ficha/Novo_${Date.now()}.html`
    };

    personagens.push(novo);
    salvar(personagens);
    renderPersonagem(novo,true);
});
