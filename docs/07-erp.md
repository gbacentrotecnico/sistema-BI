# ERP Integration (Futuro / Sprint 2)

Seguindo o Registry Pattern, quando a integração de ERP entrar em vigor, será criado um `ERPAdapter`.
Ele obedecerá aos mesmos princípios de imutabilidade.

Eventos chave que serão mapeados:
- `VENDA_REALIZADA` -> `CreateOpportunityCommand` (associando à Conversa via CPF/Telefone).
- `CLIENTE_ATUALIZADO` -> `UpdateCustomerCommand`.
