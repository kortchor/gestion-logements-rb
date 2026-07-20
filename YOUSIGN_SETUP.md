# 🔧 Configuration Yousign - Guide d'Intégration

## 📋 État Actuel

Le système utilise une version **simple** de la signature :
- Les utilisateurs reçoivent un email avec un lien de signature
- Ils cliquent sur le lien pour signer la convention
- Le système marque le bail comme signé dans la base de données

## 🚀 Pour Activer Yousign (API v3)

### Étape 1: Configurer les Variables d'Environnement

Ajoutez à votre `.env` (ou `.env.local` en développement):

```bash
# Yousign Configuration
YOUSIGN_API_KEY=your_api_key_here
YOUSIGN_ENVIRONMENT=sandbox    # ou production
YOUSIGN_WORKSPACE_ID=your_workspace_id
```

### Étape 2: Générer les Identifiants

1. Créez un compte sur [yousign.com](https://yousign.com)
2. Allez dans **Paramètres > API**
3. Créez une nouvelle clé API
4. Récupérez votre **Workspace ID**

### Étape 3: Implémenter le Client Yousign

Créez un fichier `lib/yousign-client.ts`:

```typescript
/**
 * Client Yousign pour intégration réelle
 */
class YouSignClient {
  private apiKey: string;
  private baseUrl: string;
  private workspaceId: string;

  constructor() {
    this.apiKey = process.env.YOUSIGN_API_KEY || '';
    this.baseUrl = process.env.YOUSIGN_ENVIRONMENT === 'production' 
      ? 'https://app.yousign.com/api/v3'
      : 'https://staging-app.yousign.com/api/v3';
    this.workspaceId = process.env.YOUSIGN_WORKSPACE_ID || '';

    if (!this.apiKey || !this.workspaceId) {
      console.warn('⚠️ Yousign API Key ou Workspace ID manquants');
    }
  }

  /**
   * Créer une demande de signature
   */
  async createSignatureRequest(data: {
    signerEmail: string;
    signerName: string;
    documentContent: Buffer;
    documentName: string;
  }) {
    try {
      // 1. Upload le document
      const uploadRes = await fetch(`${this.baseUrl}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: (() => {
          const formData = new FormData();
          formData.append('file', new Blob([data.documentContent]), data.documentName);
          return formData;
        })(),
      });

      if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.statusText}`);
      const { id: documentId } = await uploadRes.json();

      // 2. Créer la demande de signature
      const signatureRes = await fetch(`${this.baseUrl}/signature_requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_ids: [documentId],
          signers: [
            {
              email: data.signerEmail,
              name: data.signerName,
            },
          ],
          workspace_id: this.workspaceId,
        }),
      });

      if (!signatureRes.ok) throw new Error(`Signature request failed: ${signatureRes.statusText}`);
      const result = await signatureRes.json();

      return {
        success: true,
        requestId: result.id,
        signatureUrl: result.signature_link,
      };
    } catch (error) {
      console.error('❌ Yousign Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Vérifier le statut d'une signature
   */
  async getSignatureStatus(requestId: string) {
    try {
      const res = await fetch(`${this.baseUrl}/signature_requests/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!res.ok) throw new Error(`Status check failed: ${res.statusText}`);
      const data = await res.json();

      return {
        success: true,
        status: data.status,
        completed: data.status === 'done',
      };
    } catch (error) {
      console.error('❌ Yousign Status Check Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export default new YouSignClient();
```

### Étape 4: Mettre à Jour la Route Assigner

Modifiez `app/api/collaborateurs/[id]/assigner/route.ts`:

```typescript
import youSignClient from '@/lib/yousign-client';

// Dans la fonction assignerHandler, remplacer:
// const signatureLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/signature/${signatureToken}`;

// Par:
const yousignResult = await youSignClient.createSignatureRequest({
  signerEmail: collaborateur.email,
  signerName: `${collaborateur.prenom} ${collaborateur.nom}`,
  documentContent: pdfBuffer,
  documentName: `Convention_${collaborateur.nom}_${collaborateur.prenom}.pdf`,
});

const signatureLink = yousignResult.success 
  ? yousignResult.signatureUrl 
  : `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/signature/${signatureToken}`;

// Sauvegarder le requestId Yousign
if (yousignResult.success) {
  await client.query(
    'UPDATE baux SET yousign_request_id = $1 WHERE id = $2',
    [yousignResult.requestId, nouveauBailId]
  );
}
```

### Étape 5: Webhook Yousign (Optionnel)

Pour recevoir les notifications quand une signature est complétée:

1. Allez dans **Paramètres > Webhooks** sur Yousign
2. Ajoutez: `https://votre-domaine.com/api/webhooks/yousign`
3. Créez la route en `app/api/webhooks/yousign/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Vérifier la signature du webhook (optionnel mais recommandé)
    // const signature = request.headers.get('x-yousign-signature');
    // if (!verifyWebhookSignature(body, signature)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    if (body.event === 'signature_request.done') {
      // Mettre à jour le bail comme signé
      const requestId = body.data.id;
      await query(
        'UPDATE baux SET signe = true, date_signature = NOW() WHERE yousign_request_id = $1',
        [requestId]
      );

      console.log('✅ Signature complétée pour la demande:', requestId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Webhook Error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
```

## 📊 Comparaison

### Version Simple (Actuelle)
```
✅ Facile à mettre en place
✅ Pas de dépendances externes
❌ Pas de signature légale
❌ Pas de notification
```

### Version Yousign (Recommandée)
```
✅ Signature légale / sécurisée
✅ Notifications par email
✅ Webhooks en temps réel
✅ Historique complet
❌ Coût API
```

## 🧪 Tests

### Test Simple
```bash
# Tester que l'email arrive avec le lien de signature
curl -X POST http://localhost:3000/api/collaborateurs/1/assigner \
  -H "Content-Type: application/json" \
  -d '{
    "lit_id": 1,
    "date_debut": "2026-01-01",
    "date_fin": "2026-12-31",
    "participation_mensuelle": 500
  }'
```

### Test Yousign
```bash
# Vérifier les credentials Yousign
echo $YOUSIGN_API_KEY
echo $YOUSIGN_WORKSPACE_ID

# Testez via l'API Yousign directement
curl -H "Authorization: Bearer $YOUSIGN_API_KEY" \
  https://staging-app.yousign.com/api/v3/workspaces
```

## ⚠️ Problèmes Courants

| Problème | Solution |
|----------|----------|
| **Lien de signature ne fonctionne pas** | Vérifiez NEXTAUTH_URL dans .env |
| **Email n'arrive pas** | Vérifiez EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD |
| **Yousign retourne 401** | Vérifiez YOUSIGN_API_KEY et YOUSIGN_WORKSPACE_ID |
| **Signature ne marque pas le bail comme signé** | Vérifiez que `signe` et `date_signature` existent dans la table `baux` |

## 📚 Ressources

- [Documentation Yousign API v3](https://www.yousign.com/developers/)
- [Intégration Next.js](https://github.com/yousign/yousign-api-examples)
- [Webhooks Yousign](https://www.yousign.com/developers/webhook/)

---

**À faire après activation Yousign:**
1. ✅ Créer `lib/yousign-client.ts`
2. ✅ Ajouter les variables d'env à .env
3. ✅ Mettre à jour la route `/api/collaborateurs/[id]/assigner`
4. ✅ Créer le webhook `/api/webhooks/yousign`
5. ✅ Tester en sandbox Yousign
6. ✅ Passer en production quand prêt
