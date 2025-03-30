import * as React from 'react';

interface RejectionEmailProps {
  candidateName?: string | null;
  jobTitle: string;
  companyName?: string | null;
  baseFeedback?: string | null;
  customMessage?: string | null;
  recruiterName?: string | null;
}

export const RejectionEmail: React.FC<Readonly<RejectionEmailProps>> = ({
  candidateName,
  jobTitle,
  companyName,
  baseFeedback,
  customMessage,
  recruiterName,
}) => {
  const recipientName = candidateName || 'Kandidat';
  const senderName = recruiterName || (companyName ? `Teamet hos ${companyName}` : 'Rekrutteringsteamet');

  return (
    <div style={main}>
      <div style={container}>
        <h1 style={heading}>Oppdatering angående din søknad på stillingen som {jobTitle}</h1>
        
        <p style={paragraph}>Hei {recipientName},</p>
        
        <p style={paragraph}>
          Takk for interessen du viste for stillingen som {jobTitle}
          {companyName ? ` hos ${companyName}` : ''}.
          Vi har mottatt mange kvalifiserte søknader, og konkurransen har vært stor.
        </p>

        {baseFeedback && (
            <p style={paragraph}> 
               {baseFeedback}
            </p>
        )}

        {!baseFeedback && (
            <p style={paragraph}>
              Etter en nøye gjennomgang av din profil og kvalifikasjoner, må vi dessverre meddele at vi 
              ikke går videre med din søknad i denne omgang.
            </p>
        )}

        {customMessage && (
            <p style={{ ...paragraph, fontStyle: 'italic', borderLeft: '4px solid #ccc', paddingLeft: '12px'}}>
                {customMessage}
            </p>
        )}

        <p style={paragraph}>
          Vi setter pris på tiden og innsatsen du har lagt ned i søknadsprosessen.
          Vi oppfordrer deg til å følge med på våre ledige stillinger i fremtiden.
        </p>
        
        <p style={paragraph}>
          Med vennlig hilsen,
          <br />
          {senderName}
        </p>

        {/* Optional: Add a footer with company info or unsubscribe link */}
        {/* <hr style={hr} /> */}
        {/* <p style={footer}>Company Name | Address | Link</p> */}
      </div>
    </div>
  );
};

export default RejectionEmail;

// Basic inline styles for compatibility
const main = {
  backgroundColor: '#f6f6f6',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  padding: '20px 0',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px',
  border: '1px solid #eee',
  borderRadius: '5px',
  maxWidth: '600px',
};

const heading = {
  fontSize: '20px',
  fontWeight: 'bold' as 'bold',
  color: '#333',
  lineHeight: '1.4',
  marginBottom: '24px',
};

const paragraph = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#484848',
  marginBottom: '16px',
};

const hr = {
  borderColor: '#cccccc',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '1.5',
}; 