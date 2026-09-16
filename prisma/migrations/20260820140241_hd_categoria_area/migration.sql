-- AlterTable
ALTER TABLE `hd.categorias` ADD COLUMN `area` ENUM('suporte_tecnico', 'telefonia_voip', 'acesso_sistemas', 'rede_conectividade', 'reparos_infraestrutura') NULL;

-- AlterTable
ALTER TABLE `principal.permissoes` MODIFY `modulo` ENUM('reserva_salas', 'avaliacao_limpeza', 'gestao_pessoas') NOT NULL;
