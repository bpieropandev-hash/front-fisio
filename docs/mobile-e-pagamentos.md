# Uso no celular e recebimentos posteriores

## Datas e botões

Os botões dos cabeçalhos, filtros e rodapés de diálogos ocupam a largura disponível no celular. Os rótulos podem quebrar linha e a altura se adapta ao conteúdo, com pelo menos 44px.

Nos calendários, toque no campo para digitar `dd/mm/aaaa`; o ícone abre o calendário quando desejado. Filtros de competência usam `mm/aaaa`. Vigência de assinatura, remarcação e data da foto usam digitação `dd/mm/aaaa`, com barras automáticas e validação; a API continua recebendo `yyyy-MM-dd`. A data do recibo permanece somente leitura porque reflete o recebimento registrado.

## Paciente que paga depois da sessão

O código atual separa conclusão do atendimento e recebimento:

1. Abra a sessão na Agenda, registre a evolução e selecione Concluído.
2. Se ainda não recebeu, deixe recebedor, forma e data de recebimento sem preenchimento. A sessão avulsa fica com pagamento pendente.
3. Quando receber, reabra a sessão e preencha recebedor, forma e data real do recebimento, então salve.

Não informe pagamento fictício nem zere o valor de uma sessão avulsa para simular mensalidade.

## Mensalidade de valor fixo

Já existe em Financeiro → Assinaturas, também acessível por Nova assinatura mensal na Agenda. Cadastre paciente, serviço, valor, início e vencimento. Novos agendamentos do mesmo paciente e serviço dentro da vigência são vinculados à assinatura, sem cobrança avulsa. Gere a competência em Financeiro → Cobranças e registre o recebimento na cobrança mensal quando o dinheiro for recebido.

A modalidade atual não tem franquia de sessões. Criar uma assinatura não converte automaticamente atendimentos antigos.

## Soma das sessões paga no fim do mês

Pode ser registrada mantendo as sessões avulsas pendentes e quitando cada uma no recebimento. O sistema não tem um fechamento financeiro que some essas sessões por paciente e registre uma única baixa mensal. Isso é diferente de assinatura com valor fixo e exigiria desenvolvimento específico, incluindo regras de pagamento parcial e seleção das sessões quitadas.

Esta análise se refere ao código da branch principal dos dois repositórios em 28/10/2026; não comprova a versão instalada em produção.

## Verificação desta alteração

- `npm test -- --watch=false`: 121 testes aprovados.
- `npm run build`: compilação de produção aprovada.
- Chromium com API simulada: Agenda sem transbordamento horizontal em 320, 360, 390, 768 e 1280px; botões de ação mobile com 45px de altura; digitação no campo de data sem abrir popup.
- Não houve acesso nem alteração em registros reais de pacientes.
