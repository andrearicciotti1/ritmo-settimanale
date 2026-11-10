# Ritmo settimanale

Una mod per Claude Code: ti dice quanto del **limite settimanale di Claude** puoi usare oggi per arrivare al reset senza restare a secco, né con credito avanzato.

- **Riga di stato**: `Settimana 43% · oggi 6/12%`. Mostra quanto hai usato in tutta la settimana e quanto oggi, sul budget di oggi.
- **Banda sopra il prompt**: una barra colorata con la settimana, il ritmo ideale e il budget di oggi; diventa ambra o rossa se vai troppo veloce.
- **`/ritmo`**: apre un pannello con il grafico della settimana, giorno per giorno, contro il ritmo ideale.

Il budget di ogni giorno è ciò che ti resta diviso per i giorni che mancano al reset, quindi si ricalcola da solo. Serve un abbonamento Claude con limiti d'uso (Pro o Max) e una versione recente di Claude Code.

## Installazione

Nel prompt di una sessione di Claude Code nel terminale:

```
/plugin install ritmo-settimanale --marketplace andrearicciotti1/ritmo-settimanale
```

Rispondi `y` per aggiungere il marketplace, poi premi Invio per installarla a livello utente.

Dalla shell:

```bash
claude plugin install ritmo-settimanale --marketplace andrearicciotti1/ritmo-settimanale
```

Nell'app desktop, dove `/plugin` non funziona: clicca **+** accanto al campo del prompt, poi **Plugins**, **Add marketplace** con `andrearicciotti1/ritmo-settimanale`, poi **Add plugin**.

Per toglierla:

```bash
claude plugin uninstall ritmo-settimanale
```

## Privacy

Tutto resta sul tuo computer. La mod legge i limiti d'uso che Claude Code conosce già e si salva solo la cronologia delle ultime due settimane, nel proprio spazio locale.

## Bonus

Se usi anche lo screensaver **MU/TH/UR 6000** (in stile Alien), il suo pannello «COMPANY QUOTA» mostra i dati di questa mod.

---

## English

A Claude Code mod that tells you how much of your **weekly Claude limit** you can spend today, so you reach the reset without running dry or leaving credit unused. The interface is in Italian.

- **Status line**: `Settimana 43% · oggi 6/12%`. This is the week's usage, then today's usage against today's budget.
- **Band above the prompt**: a coloured bar with the week, the ideal pace and today's budget; it turns amber or red if you go too fast.
- **`/ritmo`**: opens a pane with a chart of the week, day by day, against the ideal pace.

Requires a Claude plan with usage limits (Pro or Max) and a recent Claude Code.

### Install

At the prompt of a terminal Claude Code session:

```
/plugin install ritmo-settimanale --marketplace andrearicciotti1/ritmo-settimanale
```

Answer `y` to add the marketplace, then press Enter for the user scope.

From a shell:

```bash
claude plugin install ritmo-settimanale --marketplace andrearicciotti1/ritmo-settimanale
```

In the desktop app, where `/plugin` doesn't run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `andrearicciotti1/ritmo-settimanale`, then **Add plugin**.

Everything stays on your computer.
