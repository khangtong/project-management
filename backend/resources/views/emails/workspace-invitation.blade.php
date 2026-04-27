{{-- resources/views/emails/workspace-invitation.blade.php --}}
@component('mail::message')
# You've Been Invited!

**{{ $inviterName }}** has invited you to join **{{ $workspaceName }}**.

@component('mail::button', ['url' => $inviteUrl])
Accept Invitation
@endcomponent

This invitation will expire in 48 hours.

Thanks,<br>
{{ config('app.name') }}
@endcomponent