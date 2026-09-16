/** @format */

import Link from "next/link";
import { LifeBuoy } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SupportCardProps {
  href: string;
}

export function SupportCard({ href }: SupportCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <LifeBuoy className="size-4 text-primary" aria-hidden="true" />
          <CardTitle>Suporte tecnico</CardTitle>
        </div>
        <CardDescription>
          Precisa de ajuda com sistemas ou equipamentos?
        </CardDescription>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground">
          Abra um chamado para receber atendimento da equipe responsavel.
        </p>
      </CardContent>

      <CardFooter>
        <Button asChild className="w-full">
          <Link href={href}>Abrir chamado</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
