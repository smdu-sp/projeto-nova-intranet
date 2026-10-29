-- AlterTable
ALTER TABLE `hd.sistemas_acesso` MODIFY `codigo` ENUM('sisacoe', 'sei', 'aprova_digital', 'slce', 'portal_licenciamento', 'simproc', 'sissel', 'slcii', 'licenca_sampa', 'suc') NOT NULL;
