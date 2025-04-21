import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

interface Step {
  equation: string;
  description: string;
}

interface SolvingStepsProps {
  steps: Step[];
  initialEquation: string;
  solution: string;
  onBack?: () => void;
}

export const SolvingSteps: React.FC<SolvingStepsProps> = ({ 
  steps, 
  initialEquation, 
  solution,
  onBack
}) => {
  console.log('Initial equation:', initialEquation);
  console.log('Steps:', JSON.stringify(steps, null, 2));
  console.log('Solution:', solution);

  return (
    <ScrollView style={styles.container}>
      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.headerText}>Solving Steps</Text>

      {/* Initial equation */}
      <View style={styles.stepContainer}>
        <View style={styles.equationRow}>
          <Text style={styles.equation}>{initialEquation}</Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </View>
      </View>

      {/* Steps */}
      {Array.isArray(steps) ? steps.map((step, index) => (
        <View key={index} style={styles.stepContainer}>
          <View style={styles.equationRow}>
            <Text style={styles.equation}>{typeof step === 'object' && step !== null ? step.equation : 'Invalid step'}</Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </View>
          <Text style={styles.description}>{typeof step === 'object' && step !== null ? step.description : ''}</Text>
          <View style={styles.separator} />
        </View>
      )) : (
        <Text style={styles.description}>No steps available</Text>
      )}

      {/* Solution */}
      <View style={styles.solutionContainer}>
        <Text style={styles.solutionLabel}>Solution</Text>
        <Text style={styles.solutionText}>x = {solution}</Text>
      </View>

      {/* Explain Steps Button */}
      <View style={styles.explainButtonContainer}>
        <TouchableOpacity style={styles.explainButton}>
          <Text style={styles.explainButtonText}>Explain Steps</Text>
          <Text style={styles.explainButtonArrow}>→</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backText: {
    color: '#dc143c',
    fontSize: 20,
    fontWeight: '500',
  },
  headerText: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 30,
  },
  stepContainer: {
    marginBottom: 20,
  },
  equationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  equation: {
    fontSize: 28,
    fontWeight: '500',
    letterSpacing: 2,
  },
  dropdownArrow: {
    fontSize: 16,
    color: '#999',
  },
  description: {
    fontSize: 18,
    color: '#999',
    marginBottom: 12,
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginTop: 12,
  },
  solutionContainer: {
    borderLeftWidth: 4,
    borderLeftColor: '#dc143c',
    paddingLeft: 16,
    marginTop: 30,
    marginBottom: 20,
  },
  solutionLabel: {
    fontSize: 24,
    color: '#dc143c',
    fontWeight: '600',
    marginBottom: 8,
  },
  solutionText: {
    fontSize: 36,
    fontWeight: '700',
  },
  explainButtonContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
  explainButton: {
    backgroundColor: '#dc143c',
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  explainButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  explainButtonArrow: {
    color: '#fff',
    fontSize: 24,
  },
}); 