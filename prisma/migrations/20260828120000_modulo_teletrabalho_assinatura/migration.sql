-- AlterTable
ALTER TABLE `principal.permissoes` MODIFY `modulo` ENUM('reserva_salas', 'avaliacao_limpeza', 'gestao_pessoas', 'assinatura_email', 'teletrabalho') NOT NULL;
