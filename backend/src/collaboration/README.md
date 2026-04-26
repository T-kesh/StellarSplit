# Collaboration Module

## Overview

The Collaboration module manages artist collaborations for tracks and projects in StellarSplit. It handles the complete workflow from invitation to completion, with proper identity management, notifications, and audit trails.

## Features

- **Invitation Management**: Send, accept, reject, and remove collaboration invitations
- **Identity Management**: Clear separation between user wallets and artist identities
- **Notification System**: Targeted notifications with proper actor identification
- **Audit Trail**: Complete audit log of all collaboration actions
- **Split Percentage Validation**: Ensures split percentages don't exceed 100%
- **Transactional Operations**: All critical operations are database transactions

## API Endpoints

### Core Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/collaborations` | Create collaboration invitation | Yes |
| GET | `/collaborations` | Get user's collaborations | Yes |
| GET | `/collaborations/:id` | Get specific collaboration | Yes |
| PUT | `/collaborations/:id/respond` | Respond to invitation | Yes |
| DELETE | `/collaborations/:id` | Remove collaboration | Yes |
| GET | `/collaborations/stats` | Get collaboration statistics | Yes |
| GET | `/collaborations/track/:trackId` | Get track collaborations | Yes |

## Data Models

### Artist Entity

```typescript
interface Artist {
  id: string;
  walletAddress: string;          // Primary identifier
  displayName: string;            // Human-readable name
  email?: string;
  avatarUrl?: string;
  bio?: string;
  status: ArtistStatus;           // active, inactive, suspended
  type: ArtistType;               // individual, group, organization
  reputationScore: number;        // 0-5 rating
  totalCollaborations: number;
  successfulCollaborations: number;
  isVerified: boolean;
  collaborations: Collaboration[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Collaboration Entity

```typescript
interface Collaboration {
  id: string;
  trackId: string;
  trackTitle: string;
  artist: Artist;
  artistId: string;
  invitedBy: string;              // User wallet who sent invite
  status: CollaborationStatus;    // invited, active, rejected, removed, completed
  role: CollaborationRole;        // owner, collaborator, producer, etc.
  type: CollaborationType;        // track_collaboration, album_collaboration, etc.
  splitPercentage?: number;       // 0-100, validated against total
  message?: string;               // Invitation message
  terms?: {                       // Collaboration terms
    deliverables?: string[];
    deadline?: Date;
    compensation?: {
      type: 'percentage' | 'fixed' | 'royalty';
      amount?: number;
      percentage?: number;
    };
    rights?: string[];
  };
  metadata?: Record<string, any>;
  respondedAt?: Date;
  respondedBy?: string;
  responseMessage?: string;
  removedAt?: Date;
  removedBy?: string;
  removalReason?: string;
  auditLog: AuditEntry[];         // Complete action history
  createdAt: Date;
  updatedAt: Date;
}
```

## Workflows

### 1. Invitation Flow

1. **Create Invitation**
   - User invites artist to collaborate on a track
   - System validates artist exists and no duplicate invites
   - Validates split percentage if provided
   - Creates collaboration with `status: invited`
   - Sends notification to artist
   - Records audit entry

2. **Artist Response**
   - Artist can accept or reject invitation
   - System validates only invited artist can respond
   - Updates collaboration status and timestamps
   - Sends notification to inviter
   - Records audit entry

### 2. Removal Flow

1. **Initiate Removal**
   - Either inviter or artist can remove collaboration
   - System validates user is involved in collaboration
   - Updates status to `removed`
   - Sends notification to other party
   - Records audit entry with reason

### 3. Identity Management

The module maintains clear separation between:

- **User Wallet**: Primary authentication identifier
- **Artist Profile**: Professional identity with metadata
- **Actor Identification**: Correct notification targeting based on action context

## Validation Rules

### Split Percentage Validation

- Total split percentages for a track cannot exceed 100%
- Individual splits must be between 0-100
- Validation occurs on invitation creation and updates

### Identity Validation

- Artist must exist with valid wallet address
- Only invited artist can respond to invitations
- Only involved parties can remove collaborations
- Duplicate invitations are blocked

### Status Transitions

```
invited → active (accept)
invited → rejected (reject)
invited → removed (remove)
active → completed (mark complete)
active → removed (remove)
```

## Notification System

### Notification Types

1. **Collaboration Invitation**
   - Sent to: Artist wallet address
   - Includes: Track info, inviter, role, message

2. **Collaboration Response**
   - Sent to: Inviter wallet address
   - Includes: Artist info, decision, response message

3. **Collaboration Removal**
   - Sent to: Other party (not remover)
   - Includes: Remover info, reason

### Actor Identity

Notifications correctly identify:
- **Who performed the action** (actor)
- **Who should receive the notification** (target)
- **What the action was** (context)

## Audit Trail

Every action creates an audit entry:

```typescript
interface AuditEntry {
  action: string;          // 'invited', 'accepted', 'rejected', 'removed'
  performedBy: string;     // User wallet address
  performedAt: Date;
  details?: Record<string, any>;
}
```

## Error Handling

### Common Errors

- `NotFoundException`: Artist or collaboration not found
- `ForbiddenException`: User not authorized for action
- `ConflictException`: Duplicate invitation
- `BadRequestException`: Invalid split percentage or status

### Transaction Safety

All critical operations use database transactions:
- Invitation creation
- Response handling
- Removal operations
- Audit log updates

## Testing

The module includes comprehensive tests covering:
- All endpoint workflows
- Permission validation
- Split percentage validation
- Notification targeting
- Audit trail functionality
- Error scenarios

## Integration Points

### Dependencies
- **TypeORM**: Database operations
- **NestJS Guards**: Authentication
- **Notification Service**: External notifications (future)

### Used By
- **Frontend**: Collaboration management UI
- **Other Modules**: Track management, payment processing

## Future Enhancements

1. **Advanced Notifications**: Push notifications, email, in-app
2. **Collaboration Templates**: Pre-defined collaboration terms
3. **Smart Contract Integration**: Blockchain-based agreements
4. **Analytics Dashboard**: Collaboration metrics and insights
5. **Dispute Resolution**: Built-in conflict resolution system
