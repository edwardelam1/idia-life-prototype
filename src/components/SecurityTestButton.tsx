import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const SecurityTestButton = () => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testCrazy8Security = async () => {
    setTesting(true);
    setResult(null);
    
    try {
      console.log('Testing crazy-8-security function directly...');
      
      // Test 1: Health check
      const healthResponse = await supabase.functions.invoke('crazy-8-security', {
        body: { agent: 'test', action: 'health_check' }
      });
      
      console.log('Health check response:', healthResponse);
      
      // Test 2: Direct security analysis
      const analysisResponse = await supabase.functions.invoke('crazy-8-security', {
        body: {
          agent: 'crazy_sentinel',
          action: 'analyze_connection',
          data: { connection_type: 'test', user_id: 'test-user' },
          context: { test: true }
        }
      });
      
      console.log('Analysis response:', analysisResponse);
      
      setResult({
        health: healthResponse,
        analysis: analysisResponse,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Test failed:', error);
      setResult({ error: error.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Crazy-8-Security Test</h3>
      <Button 
        onClick={testCrazy8Security} 
        disabled={testing}
        className="mb-4"
      >
        {testing ? 'Testing...' : 'Test Security Function'}
      </Button>
      
      {result && (
        <div className="mt-4">
          <h4 className="font-medium mb-2">Test Results:</h4>
          <pre className="bg-muted p-2 rounded text-sm overflow-auto max-h-64">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default SecurityTestButton;