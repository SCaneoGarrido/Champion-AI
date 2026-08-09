/**
 * ReaderCard — tarjeta principal de lectura del Knowledge Workspace.
 * Recibe una DocumentSection ya resuelta (ver `utils/workspaceMapper.js`) y la
 * renderiza: badge + título de sección, párrafos (texto con drop cap / cita /
 * imagen) y paginación. No sabe de dónde viene la data (Resumen, Notas,
 * Transcripción) — solo consume el modelo Document/DocumentSection/Paragraph.
 *
 * El fade-in usa el `Animated` core de React Native, no `react-native-reanimated`
 * — ver nota en FloatingToolbar.jsx sobre por qué Reanimated no corre en Expo Go.
 */
import React, { memo, useEffect, useRef } from 'react';
import { Animated, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AIQuoteCard from './AIQuoteCard';
import ImageCard from './ImageCard';
import RichMarkdown from './RichMarkdown';
import styles from './ReaderCard.styles';

const DropCapParagraph = memo(function DropCapParagraph({ content }) {
  if (!content) return null;
  const chars = Array.from(content);
  const first = chars[0];
  const rest = chars.slice(1).join('');
  return (
    <Text style={styles.paragraph}>
      <Text style={styles.dropCap}>{first}</Text>
      {rest}
    </Text>
  );
});

// `rich` viene de `section.rich` (ver workspaceMapper.js): true para
// Resumen/Notas (contenido gpt-5-mini, Markdown + LaTeX real vía
// RichMarkdown), false para Transcripción (texto plano garantizado — sale
// directo de Fast Transcription, nunca pasa por los prompts de Markdown/LaTeX,
// no vale la pena el costo de un renderizador ahí).
function renderParagraph(paragraph, index, isDropCap, rich) {
  if (paragraph.type === 'quote') {
    return <AIQuoteCard key={index} quote={paragraph.quote} author={paragraph.author} />;
  }
  if (paragraph.type === 'image') {
    return <ImageCard key={index} image={paragraph.image} caption={paragraph.caption} />;
  }
  if (rich) {
    return <RichMarkdown key={index} content={paragraph.content} />;
  }
  return isDropCap
    ? <DropCapParagraph key={index} content={paragraph.content} />
    : <Text key={index} style={styles.paragraph}>{paragraph.content}</Text>;
}

function FooterPagination({ sectionIndex, totalSections, onPrevious, onNext }) {
  if (totalSections <= 1) return null;
  const atStart = sectionIndex <= 0;
  const atEnd = sectionIndex >= totalSections - 1;

  return (
    <View style={styles.footer}>
      <TouchableOpacity
        style={[styles.pageBtn, atStart && styles.pageBtnDisabled]}
        onPress={onPrevious}
        disabled={atStart}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Sección anterior"
      >
        <MaterialIcons name="chevron-left" size={22} color="#2E2E2E" />
      </TouchableOpacity>

      <Text style={styles.pageLabel}>{sectionIndex + 1}-{totalSections}</Text>

      <TouchableOpacity
        style={[styles.pageBtn, atEnd && styles.pageBtnDisabled]}
        onPress={onNext}
        disabled={atEnd}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Sección siguiente"
      >
        <MaterialIcons name="chevron-right" size={22} color="#2E2E2E" />
      </TouchableOpacity>
    </View>
  );
}

export default function ReaderCard({ section, sectionIndex, totalSections, onPrevious, onNext }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [section?.id, opacity]);

  if (!section) {
    return (
      <View style={styles.card}>
        <View style={styles.emptyWrap}>
          <MaterialIcons name="menu-book" size={28} color="#6B6B6B" />
          <Text style={styles.emptyText}>Sin datos disponibles todavía.</Text>
        </View>
      </View>
    );
  }

  const firstTextIndex = section.paragraphs.findIndex(p => p.type === 'text');

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Sección {section.number}</Text>
          </View>
          <Text style={styles.title}>{section.title}</Text>
        </View>

        {section.paragraphs.map((p, i) => renderParagraph(p, i, i === firstTextIndex, section.rich))}

        <FooterPagination
          sectionIndex={sectionIndex}
          totalSections={totalSections}
          onPrevious={onPrevious}
          onNext={onNext}
        />
      </ScrollView>
    </Animated.View>
  );
}
